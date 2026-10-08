// A failed topic must leave the daily queue even if inference/review failed
// before a Markdown draft could be saved. The review record explains recovery.
export async function runContentJob(page, generate, save) {
  let data, outPath;
  const errors = [];
  try {
    data = await generate(page);
    outPath = await save(page, data);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    if (data && typeof data === 'object') {
      data._draft = true;
      data._review = { pass: false, issues: [...(data._review?.issues ?? []), ...errors] };
      try {
        outPath = await save(page, data);
      } catch (saveError) {
        errors.push('Draft could not be saved: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
      }
    }
  }
  const needsReview = errors.length > 0 || !outPath || data?._draft !== false;
  return { data, outPath, errors, status: needsReview ? 'review' : 'generated' };
}

export function recordContentJob(rows, slug, result) {
  for (const row of rows) {
    if (row.slug === slug && row.status === 'pending') row.status = result.status;
  }
}
