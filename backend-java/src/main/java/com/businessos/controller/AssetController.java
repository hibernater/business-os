package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.repository.EnterpriseAssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private static final Logger log = LoggerFactory.getLogger(AssetController.class);

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private final EnterpriseAssetRepository assetRepo;

    public AssetController(EnterpriseAssetRepository assetRepo) {
        this.assetRepo = assetRepo;
    }

    @GetMapping
    public Map<String, Object> listAssets(@RequestParam(required = false) String type) {
        String enterpriseId = TenantContext.get();
        List<EnterpriseAsset> assets;
        if (type != null && !type.isBlank()) {
            assets = assetRepo.findByEnterpriseIdAndAssetTypeOrderByCreatedAtDesc(enterpriseId, type);
        } else {
            // 默认不返回 execution_record 类型（通过专门接口查）
            assets = assetRepo.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId).stream()
                    .filter(a -> !"execution_record".equals(a.getAssetType()))
                    .toList();
        }

        List<Map<String, Object>> result = assets.stream().map(a -> Map.<String, Object>of(
                "id", a.getId(),
                "assetType", a.getAssetType(),
                "name", a.getName(),
                "content", a.getContent() != null ? a.getContent() : "",
                "source", a.getSource() != null ? a.getSource() : "",
                "createdAt", a.getCreatedAt().toString()
        )).toList();

        return Map.of("assets", result, "total", result.size());
    }

    @PostMapping
    public EnterpriseAsset createAsset(@RequestBody CreateAssetRequest req) {
        String enterpriseId = TenantContext.get();
        EnterpriseAsset asset = EnterpriseAsset.builder()
                .enterpriseId(enterpriseId)
                .assetType(req.getAssetType())
                .name(req.getName())
                .content(req.getContent())
                .source(req.getSource() != null ? req.getSource() : "user_upload")
                .build();
        return assetRepo.save(asset);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteAsset(@PathVariable String id) {
        String enterpriseId = TenantContext.get();
        assetRepo.findById(id).ifPresent(asset -> {
            if (asset.getEnterpriseId().equals(enterpriseId)) {
                assetRepo.delete(asset);
            }
        });
        return Map.of("status", "ok");
    }

    @PostMapping("/upload")
    public Map<String, Object> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "assetType", defaultValue = "document") String assetType
    ) {
        String enterpriseId = TenantContext.get();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";

        try {
            Path dir = Paths.get(uploadDir, enterpriseId);
            Files.createDirectories(dir);
            String storedName = UUID.randomUUID().toString().substring(0, 8) + "_" + originalName;
            Path filePath = dir.resolve(storedName);
            file.transferTo(filePath.toFile());

            String content = extractContent(file, originalName);

            EnterpriseAsset asset = EnterpriseAsset.builder()
                    .enterpriseId(enterpriseId)
                    .assetType(assetType)
                    .name(originalName)
                    .content(content)
                    .filePath(filePath.toString())
                    .source("user_upload")
                    .build();
            assetRepo.save(asset);

            Map<String, Object> result = new HashMap<>();
            result.put("status", "ok");
            result.put("id", asset.getId());
            result.put("name", originalName);
            result.put("assetType", assetType);
            result.put("contentPreview", content.length() > 200 ? content.substring(0, 200) + "..." : content);
            result.put("fileSize", file.getSize());
            return result;
        } catch (Exception e) {
            log.error("File upload failed: {}", e.getMessage());
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    private String extractContent(MultipartFile file, String filename) {
        String lower = filename.toLowerCase();
        try {
            if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".md")) {
                return readTextContent(file);
            }
            if (lower.endsWith(".xlsx")) {
                return readExcelContent(file, true);
            }
            if (lower.endsWith(".xls")) {
                return readExcelContent(file, false);
            }
            if (lower.endsWith(".pdf")) {
                return readPdfContent(file);
            }
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif")) {
                return "[图片文件] " + filename + " (" + file.getSize() + " bytes)";
            }
            return "[文件] " + filename + " (" + file.getSize() + " bytes)";
        } catch (Exception e) {
            log.warn("extractContent failed for {}: {}", filename, e.getMessage());
            return "[文件读取失败] " + filename;
        }
    }

    private String readTextContent(MultipartFile file) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int lineCount = 0;
            while ((line = reader.readLine()) != null && lineCount < 500) {
                sb.append(line).append("\n");
                lineCount++;
            }
            if (lineCount >= 500) {
                sb.append("\n...(文件过长，仅展示前500行)");
            }
        }
        return sb.toString();
    }

    private String readExcelContent(MultipartFile file, boolean isXlsx) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (Workbook workbook = isXlsx
                ? new XSSFWorkbook(file.getInputStream())
                : new HSSFWorkbook(file.getInputStream())) {

            DataFormatter formatter = new DataFormatter();
            int sheetCount = Math.min(workbook.getNumberOfSheets(), 3);

            for (int s = 0; s < sheetCount; s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName();
                sb.append("【").append(sheetName).append("】\n");

                int maxRows = Math.min(sheet.getLastRowNum() + 1, 100);
                for (int r = 0; r < maxRows; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    int maxCols = Math.min(row.getLastCellNum(), 20);
                    for (int c = 0; c < maxCols; c++) {
                        Cell cell = row.getCell(c);
                        String val = cell != null ? formatter.formatCellValue(cell) : "";
                        if (c > 0) sb.append("\t");
                        sb.append(val);
                    }
                    sb.append("\n");
                }
                if (sheet.getLastRowNum() >= 100) {
                    sb.append("...(仅展示前100行)\n");
                }
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    private String readPdfContent(MultipartFile file) throws Exception {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(doc.getNumberOfPages(), 20));
            String text = stripper.getText(doc);
            if (text.length() > 10000) {
                text = text.substring(0, 10000) + "\n...(仅展示前10000字符)";
            }
            return text;
        }
    }

    @GetMapping("/download/{id}")
    public org.springframework.core.io.Resource downloadFile(@PathVariable String id) throws Exception {
        String enterpriseId = TenantContext.get();
        EnterpriseAsset asset = assetRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found"));
        if (!asset.getEnterpriseId().equals(enterpriseId)) {
            throw new RuntimeException("Access denied");
        }
        if (asset.getFilePath() == null || asset.getFilePath().isBlank()) {
            throw new RuntimeException("No file associated");
        }
        Path path = Paths.get(asset.getFilePath());
        return new org.springframework.core.io.FileSystemResource(path);
    }

    public static class CreateAssetRequest {
        private String assetType;
        private String name;
        private String content;
        private String source;

        public String getAssetType() { return assetType; }
        public void setAssetType(String assetType) { this.assetType = assetType; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
    }
}
