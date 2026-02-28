307
308
309
310
311
312
313
314
315
316
317
318
319
320
321
322
323
324
325
326
327
328
329
330
331
332
333
334
335
336
337
338
339
340
341
342
343
344
345
346
347
348
349
350
351
352
353
354
355
356
357
358
359
360
361
362
363
364
365
366
367
368
369
370
371
372
373
374
375
376
377
378
379
380
381
382
383
384
385
386
387
388
389
390
391
392
393
394
395
396
397
398
import React, { useState, useEffect, useRef, useCallback } from 'react';
  },
  chipText: {
    fontSize: 14,
    color: Colors.cautionText,
    fontWeight: '600' as const,
  },
  restartButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  warningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  warningContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  warningClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  warningIconRow: {
    marginTop: 8,
    marginBottom: 16,
  },
  warningIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningBody: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  dangerButton: {
    backgroundColor: Colors.danger,
    borderRadius: 16,
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dangerButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  secondaryWarningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  secondaryWarningText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
