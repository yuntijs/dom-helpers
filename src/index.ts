interface HeightCalculationOptions {
  maxDepth?: number;
  includeMargins?: boolean;
  includePadding?: boolean;
  useScrollHeight?: boolean;
  layoutTypes?: string[];
}

interface HeightCalculationConfig extends Required<HeightCalculationOptions> {}

interface ChildMetrics {
  top: number;
  bottom: number;
}

function getContentHeight(
  container: HTMLElement,
  options: HeightCalculationOptions = {}
): number {
  const defaultOptions: Required<HeightCalculationOptions> = {
    maxDepth: 3,
    includeMargins: true,
    includePadding: true,
    useScrollHeight: false,
    layoutTypes: ["grid", "flex", "block"],
  };

  const config: HeightCalculationConfig = { ...defaultOptions, ...options };
  return calculateHeight(container, 0, config);
}

function calculateHeight(
  container: HTMLElement,
  currentDepth: number,
  config: HeightCalculationConfig
): number {
  const children: HTMLElement[] = [];
  for (let i = 0; i < container.children.length; i++) {
    children.push(container.children[i] as HTMLElement);
  }

  // If no children or reached max depth
  if (children.length === 0 || currentDepth >= config.maxDepth) {
    return config.useScrollHeight
      ? container.scrollHeight
      : container.offsetHeight;
  }

  let minTop = Infinity;
  let maxBottom = -Infinity;
  let hasVisibleChildren = false;

  children.forEach((child) => {
    if (isElementHidden(child)) return;

    hasVisibleChildren = true;
    const childMetrics = getChildMetrics(
      child,
      container,
      currentDepth,
      config
    );

    minTop = Math.min(minTop, childMetrics.top);
    maxBottom = Math.max(maxBottom, childMetrics.bottom);
  });

  if (!hasVisibleChildren) {
    return config.useScrollHeight
      ? container.scrollHeight
      : container.offsetHeight;
  }

  // Calculate actual content height
  const contentHeight = maxBottom - Math.max(0, minTop);

  // Include container padding if needed
  if (config.includePadding) {
    const containerStyle = window.getComputedStyle(container);
    const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
    return contentHeight + paddingTop + paddingBottom;
  }

  return contentHeight;
}

function getChildMetrics(
  child: HTMLElement,
  container: HTMLElement,
  currentDepth: number,
  config: HeightCalculationConfig
): ChildMetrics {
  const childStyle = window.getComputedStyle(child);
  const childDisplay = childStyle.display;

  // Check if deep calculation is needed
  const needsDeepCalculation = shouldCalculateDeep(
    child,
    childDisplay,
    config.layoutTypes,
    currentDepth,
    config.maxDepth
  );

  let childHeight;
  if (needsDeepCalculation) {
    // Recursively calculate child element actual height
    childHeight = calculateHeight(child, currentDepth + 1, config);
  } else {
    // Use standard height
    childHeight = child.offsetHeight;
  }

  // Get child element position relative to container
  const childRect = child.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const relativeTop = childRect.top - containerRect.top;

  // Handle margins
  let marginTop = 0,
    marginBottom = 0;
  if (config.includeMargins) {
    marginTop = parseFloat(childStyle.marginTop) || 0;
    marginBottom = parseFloat(childStyle.marginBottom) || 0;
  }

  return {
    top: relativeTop - marginTop,
    bottom: relativeTop + childHeight + marginBottom,
  };
}

function shouldCalculateDeep(
  element: HTMLElement,
  display: string,
  layoutTypes: string[],
  currentDepth: number,
  maxDepth: number
): boolean {
  // If already at max depth minus one, don't go deeper
  if (currentDepth >= maxDepth - 1) return false;

  // Check if it's a layout type that needs special handling
  const isLayoutContainer =
    layoutTypes.indexOf(display) !== -1 ||
    layoutTypes.indexOf(display.split(" ")[0]) !== -1;

  if (!isLayoutContainer) return false;

  // Special check: if Grid or Flex container has fixed height, might need deep calculation
  const computedStyle = window.getComputedStyle(element);
  const hasFixedHeight =
    computedStyle.height !== "auto" &&
    computedStyle.height !== "" &&
    computedStyle.height.indexOf("%") === -1;

  // Grid and Flex layouts often need deep calculation
  if (display === "grid" || display === "flex") {
    return true;
  }

  // For block elements, only deep calculate when content might overflow
  if (display === "block" && hasFixedHeight) {
    return element.scrollHeight > element.offsetHeight;
  }

  return false;
}

function isElementHidden(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    element.offsetHeight === 0
  );
}

const presets: Record<string, HeightCalculationOptions> = {
  fast: { maxDepth: 1, useScrollHeight: true },
  standard: { maxDepth: 3, layoutTypes: ["grid", "flex"] },
  precise: { maxDepth: 5, layoutTypes: ["grid", "flex", "block"] },
  gridOptimized: {
    maxDepth: 2,
    layoutTypes: ["grid"],
    includeMargins: true,
    includePadding: false,
  },
};

function getContentHeightFast(container: HTMLElement): number {
  return getContentHeight(container, presets.fast);
}

function getContentHeightPrecise(container: HTMLElement): number {
  return getContentHeight(container, presets.precise);
}

function getContentHeightForGrid(container: HTMLElement): number {
  return getContentHeight(container, presets.gridOptimized);
}

export {
  getContentHeight,
  getContentHeightFast,
  getContentHeightPrecise,
  getContentHeightForGrid,
  type HeightCalculationOptions,
};
