/** Turn `/images/dashboard/couple/in_rain.png` into "In Rain" */
export function labelFromDashboardImage(publicPath: string): string {
  const file = publicPath.replace(/^.*\//, '').replace(/\.[^.]+$/i, '')
  return file
    .split(/_+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
