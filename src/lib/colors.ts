/**
 * Color utilities for accessing CSS variables
 * All colors are defined in src/app/globals.css
 */

/**
 * Get a CSS variable value at runtime
 * Handles nested CSS variables (e.g., var(--primary) will be resolved)
 */
export function getCSSVariable(variableName: string): string {
  if (typeof window === 'undefined') return '';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  
  // If the value is a CSS variable reference (var(--something)), resolve it recursively
  const varMatch = value.match(/^var\(([^)]+)\)$/);
  if (varMatch) {
    const nestedVar = varMatch[1].trim();
    return getCSSVariable(nestedVar);
  }
  
  return value;
}

/**
 * Chart color palette - array of CSS variable names
 * Use these in style objects: style={{ fill: `var(${CHART_COLORS[0]})` }}
 */
export const CHART_COLORS = [
  '--chart-color-1',  // Primary
  '--chart-color-2',  // Blue
  '--chart-color-3',  // Green
  '--chart-color-4',  // Purple
  '--chart-color-5',  // Orange
  '--chart-color-6',  // Pink
  '--chart-color-7',  // Teal
  '--chart-color-8',  // Amber
  '--chart-color-9',  // Violet
  '--chart-color-10', // Light Red
  '--chart-color-other', // Gray for "Other"
] as const;

/**
 * Get chart color as CSS variable string
 * Usage: fill={getChartColor(0)} returns "var(--chart-color-1)"
 */
export function getChartColor(index: number): string {
  const colorVar = CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)];
  return `var(${colorVar})`;
}

/**
 * Get chart color as computed hex value (for libraries that need actual colors)
 * Usage: fill={getChartColorValue(0)} returns the computed primary color
 */
export function getChartColorValue(index: number): string {
  const colorVar = CHART_COLORS[Math.min(index, CHART_COLORS.length - 1)];
  const value = getCSSVariable(colorVar);
  // Fallback to actual CSS values if not available (SSR)
  if (!value && index === 0) return '#a43c38'; // primary fallback
  if (!value) {
    const fallbacks = [
      '#a43c38', '#3B82F6', '#10B981', '#A855F7', '#F97316',
      '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#A0A0A0'
    ];
    return fallbacks[index] || fallbacks[0];
  }
  return value;
}

/**
 * Get all chart colors as CSS variable strings
 */
export function getAllChartColors(): string[] {
  return CHART_COLORS.map(color => `var(${color})`);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Get primary-based gradient color using opacity
 * Highest value (intensity = 1) = full primary color
 * Lower values = primary color with reduced opacity (with floor)
 * 
 * @param intensity - Value from 0 to 1 (0 = lowest opacity, 1 = full opacity)
 * @returns RGBA color string like "rgba(164, 60, 56, 0.5)"
 */
export function getPrimaryGradientColor(intensity: number): string {
  // Get primary color from CSS
  const primaryHex = typeof window !== 'undefined' 
    ? getCSSVariable('--primary') || '#a43c38'
    : '#a43c38';
  
  const primaryRgb = hexToRgb(primaryHex);
  
  if (!primaryRgb) {
    // Fallback if parsing fails
    return `rgba(164, 60, 56, 0.5)`;
  }

  // Get opacity settings from CSS
  const opacityMax = typeof window !== 'undefined'
    ? parseFloat(getCSSVariable('--chart-gradient-opacity-max') || '1')
    : 1;
  const opacityMin = typeof window !== 'undefined'
    ? parseFloat(getCSSVariable('--chart-gradient-opacity-min') || '0.3')
    : 0.3;

  // Calculate opacity: intensity 1 = max opacity, intensity 0 = min opacity (floor)
  // Clamp intensity to ensure it's between 0 and 1
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  const opacity = opacityMin + (clampedIntensity * (opacityMax - opacityMin));

  return `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${opacity})`;
}

/**
 * Get primary color as hex (for libraries that need hex values)
 */
export function getPrimaryColorHex(): string {
  if (typeof window === 'undefined') return '#a43c38';
  return getCSSVariable('--primary') || '#a43c38';
}

/**
 * Generate primary-based gradient colors for calendar levels
 * Returns array of colors from lightest (level 0) to darkest (level 4)
 * Level 0 = no activity (transparent)
 * Level 1-3 = primary color with increasing opacity
 * Level 4 = full primary color
 */
export function getCalendarGradientColors(): string[] {
  const primaryHex = getPrimaryColorHex();
  const primaryRgb = hexToRgb(primaryHex);
  
  if (!primaryRgb) {
    // Fallback colors
    return [
      '#ebedf010', // Level 0 - no activity
      '#ffcccc',   // Level 1
      '#ff9999',   // Level 2
      '#ff6666',   // Level 3
      primaryHex,  // Level 4 - full primary
    ];
  }

  // Generate gradient: level 0 = transparent, level 1-3 = increasing opacity, level 4 = full
  const opacities = [0, 0.25, 0.5, 0.75, 1];
  
  return opacities.map(opacity => {
    if (opacity === 0) return '#ebedf010'; // No activity - very light gray
    return `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${opacity})`;
  });
}

