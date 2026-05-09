-- Poner al día business_images con los slides ya existentes del negocio.
-- businessId: 806ca0e9-242e-466a-8fea-6a7c726d4fe2
-- Solo inserta si el slide aún no tiene registro en business_images.

INSERT INTO `business_images` (`id`, `businessId`, `slideId`, `fileUrl`, `uploadedAt`, `width`, `height`, `sizeBytes`, `mimeType`)
SELECT
  UUID(),
  '806ca0e9-242e-466a-8fea-6a7c726d4fe2',
  s.id,
  s.fileUrl,
  COALESCE(s.createdAt, CURRENT_TIMESTAMP(3)),
  NULL,
  NULL,
  0,
  CASE
    WHEN s.fileUrl LIKE '%.jpg' OR s.fileUrl LIKE '%.jpeg' THEN 'image/jpeg'
    WHEN s.fileUrl LIKE '%.png' THEN 'image/png'
    WHEN s.fileUrl LIKE '%.gif' THEN 'image/gif'
    WHEN s.fileUrl LIKE '%.webp' THEN 'image/webp'
    WHEN s.fileUrl LIKE '%.mp4' THEN 'video/mp4'
    WHEN s.fileUrl LIKE '%.webm' THEN 'video/webm'
    WHEN s.fileUrl LIKE '%.mov' THEN 'video/quicktime'
    ELSE NULL
  END
FROM `slides` s
INNER JOIN `screens` sc ON sc.id = s.screenId AND sc.deletedAt IS NULL
WHERE sc.businessId = '806ca0e9-242e-466a-8fea-6a7c726d4fe2'
  AND s.deletedAt IS NULL
  AND NOT EXISTS (SELECT 1 FROM `business_images` bi WHERE bi.slideId = s.id);
