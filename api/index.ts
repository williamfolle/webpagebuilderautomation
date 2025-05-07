import express from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { JSDOM } from 'jsdom';

// Create Vercel serverless API handler
const app = express();
app.use(express.json());

// Endpoint para verificar o conteúdo dos arquivos JS
app.get('/api/check-js-files', (req: Request, res: Response) => {
  try {
    const jsContent = readJSFiles();
    const fileSizes = {};
    
    for (const [filename, content] of Object.entries(jsContent)) {
      fileSizes[filename] = {
        size: content.length,
        preview: content.substring(0, 100) + '...' // Primeiros 100 caracteres
      };
    }
    
    res.json({ success: true, jsFiles: fileSizes });
  } catch (error) {
    console.error('Error checking JS files:', error);
    res.status(500).json({ error: 'Failed to check JS files' });
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Vamos usar os arquivos JS originais do attached_assets ao invés de conteúdos vazios
import fs from 'fs';
import path from 'path';

// Esta função lê os conteúdos dos arquivos JS reais
function readJSFiles() {
  try {
    const jsContent: Record<string, string> = {};
    const files = [
      'LLWebServerExtended.js',
      'envelope-cartesian.js',
      'ew-log-viewer.js',
      'scriptcustom.js'
    ];
    
    const possiblePaths = [
      './attached_assets',
      './public/js'
    ];
    
    files.forEach(file => {
      try {
        // Tenta encontrar o arquivo em vários caminhos possíveis
        let filePath = '';
        let fileContent = '';
        
        for (const basePath of possiblePaths) {
          const currentPath = path.join(basePath, file);
          if (fs.existsSync(currentPath)) {
            filePath = currentPath;
            fileContent = fs.readFileSync(filePath, 'utf8');
            break;
          }
        }
        
        if (fileContent) {
          jsContent[file] = fileContent;
          console.log(`JS file loaded: ${file}, size: ${jsContent[file].length} bytes from ${filePath}`);
        } else {
          jsContent[file] = `// Fallback content for ${file}\nconsole.log('${file} content not found, using fallback');`;
          console.log(`JS file not found in any path: ${file}, using fallback.`);
        }
      } catch (error) {
        console.error(`Error loading JS file ${file}:`, error);
        jsContent[file] = `// Fallback content for ${file}\nconsole.log('Error loading ${file}');`;
      }
    });
    
    return jsContent;
  } catch (error) {
    console.error("Error reading JS files:", error);
    return {
      "LLWebServerExtended.js": "// Fallback content\nconsole.log('Error loading original JS files');",
      "envelope-cartesian.js": "// Fallback content\nconsole.log('Error loading original JS files');",
      "ew-log-viewer.js": "// Fallback content\nconsole.log('Error loading original JS files');",
      "scriptcustom.js": "// Fallback content\nconsole.log('Error loading original JS files');"
    };
  }
}

const JS_CONTENT = readJSFiles();

/**
 * Parse multiple CSV files and return their data
 */
async function parseCSVFiles(csvFiles: Express.Multer.File[]): Promise<Array<{filename: string, data: unknown[]}>> {
  if (!csvFiles || csvFiles.length === 0) {
    return [];
  }

  const parsedData: Array<{filename: string, data: unknown[]}> = [];

  for (const csvFile of csvFiles) {
    const content = csvFile.buffer.toString('utf8');
    
    const parseResult = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.data && parseResult.data.length > 0) {
      parsedData.push({
        filename: csvFile.originalname,
        data: parseResult.data as unknown[],
      });
    }
  }

  return parsedData;
}

/**
 * Find a matching row in the CSV data based on the NV value
 */
function findMatchingCSVRow(csvData: Array<{filename: string, data: unknown[]}>, nvValue: string): Record<string, any> | null {
  if (!nvValue || !csvData || csvData.length === 0) {
    return null;
  }

  // Convert nvValue to lowercase for case-insensitive matching
  const lowerNvValue = nvValue.toLowerCase();

  // Try to find a match across all CSV files
  for (const csv of csvData) {
    for (const row of csv.data) {
      // Print out row keys for debugging
      const typedRow = row as Record<string, any>;
      console.log('Row keys:', Object.keys(typedRow).join(', '));
      
      // Case-insensitive match for either "Address" or any key containing "address"
      const addressKey = Object.keys(typedRow).find(key => 
        key.toLowerCase() === "address" || 
        key.toLowerCase().includes("address") ||
        key.toLowerCase() === "variable" ||
        key.toLowerCase().includes("variable")
      );

      if (addressKey) {
        console.log(`Found address key: ${addressKey}, value: ${typedRow[addressKey]}, comparing to: ${nvValue}`);
        if (String(typedRow[addressKey]).toLowerCase() === lowerNvValue) {
          return typedRow;
        }
      }
    }
  }

  return null;
}

/**
 * Process a checkbox input element with CSV data
 */
function processCheckboxElement(element: Element, csvRow: Record<string, any>): void {
  const addressValue = element.getAttribute("nv");
  if (!addressValue) return;

  // Set data-llweb-par attribute
  element.setAttribute("data-llweb-par", addressValue);
  
  // Set data-llweb-refresh attribute
  element.setAttribute("data-llweb-refresh", "true");
  
  // Set data-llweb-format attribute with the format (default to empty string)
  const formatKey = Object.keys(csvRow).find(key => 
    key.toLowerCase() === "format" || key.toLowerCase().includes("format")
  );
  
  if (formatKey && csvRow[formatKey]) {
    element.setAttribute("data-llweb-format", String(csvRow[formatKey]));
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a radio input element with CSV data
 */
function processRadioElement(element: Element, csvRow: Record<string, any>): void {
  const addressValue = element.getAttribute("nv");
  if (!addressValue) return;

  // Set data-llweb-par attribute
  element.setAttribute("data-llweb-par", addressValue);
  
  // Set data-llweb-refresh attribute
  element.setAttribute("data-llweb-refresh", "true");
  
  // Set name attribute
  element.setAttribute("name", `rad-${addressValue}`);
  
  // Determine if this is "true" or "false" radio based on value
  const value = element.getAttribute("value")?.toLowerCase();
  
  // Set id with suffix based on true/false value
  const idSuffix = value === "true" || value === "1" ? "1" : "2";
  element.setAttribute("id", `rad-ctrl-${addressValue}-${idSuffix}`);
}

/**
 * Process a regular input element with CSV data
 */
function processInputElement(element: Element, csvRow: Record<string, any>): void {
  const addressValue = element.getAttribute("nv");
  if (!addressValue) return;

  // Set data-llweb-par attribute
  element.setAttribute("data-llweb-par", addressValue);
  
  // Set data-llweb-refresh attribute
  element.setAttribute("data-llweb-refresh", "true");
  
  // Set data-llweb-format attribute with the format (default to empty string)
  const formatKey = Object.keys(csvRow).find(key => 
    key.toLowerCase() === "format" || key.toLowerCase().includes("format")
  );
  
  if (formatKey && csvRow[formatKey]) {
    element.setAttribute("data-llweb-format", String(csvRow[formatKey]));
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a select element with CSV data
 */
function processSelectElement(element: Element, csvRow: Record<string, any>): void {
  const addressValue = element.getAttribute("nv");
  if (!addressValue) return;

  // Set data-llweb-par attribute
  element.setAttribute("data-llweb-par", addressValue);
  
  // Set data-llweb-refresh attribute
  element.setAttribute("data-llweb-refresh", "true");
  
  // Set data-llweb-format attribute with the format (default to empty string)
  const formatKey = Object.keys(csvRow).find(key => 
    key.toLowerCase() === "format" || key.toLowerCase().includes("format")
  );
  
  if (formatKey && csvRow[formatKey]) {
    element.setAttribute("data-llweb-format", String(csvRow[formatKey]));
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a button element with CSV data
 */
function processButtonElement(element: Element, csvRow: Record<string, any>): void {
  const addressValue = element.getAttribute("nv");
  if (!addressValue) return;

  // Set data-llweb-par attribute
  element.setAttribute("data-llweb-par", addressValue);
  
  // Set data-llweb-refresh attribute
  element.setAttribute("data-llweb-refresh", "true");
  
  // Set data-llweb-format attribute with the format (default to empty string)
  const formatKey = Object.keys(csvRow).find(key => 
    key.toLowerCase() === "format" || key.toLowerCase().includes("format")
  );
  
  if (formatKey && csvRow[formatKey]) {
    element.setAttribute("data-llweb-format", String(csvRow[formatKey]));
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

// API endpoint for processing files
app.post('/api/process-files', upload.fields([
  { name: 'zip', maxCount: 1 },
  { name: 'csv', maxCount: 10 }
]), async (req, res) => {
  try {
    // Simple validation
    if (!req.files) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const zipFile = files['zip']?.[0];
    const csvFiles = files['csv'] || [];
    
    if (!zipFile) {
      return res.status(400).json({ error: 'ZIP file is required' });
    }
    
    console.log('Processing files:', zipFile.originalname, csvFiles.map((f: Express.Multer.File) => f.originalname).join(', '));
    
    // Parse CSV files
    const csvData = await parseCSVFiles(csvFiles);
    console.log('CSV data parsed, found rows:', csvData.reduce((acc, csv) => acc + csv.data.length, 0));
    
    // Sample the first row of the first CSV file to see what we're working with
    if (csvData.length > 0 && csvData[0].data.length > 0) {
      console.log('Sample CSV row:', JSON.stringify(csvData[0].data[0]));
    }
    
    // Extract the ZIP
    const zip = await JSZip.loadAsync(zipFile.buffer);
    console.log('ZIP loaded, contains files:', Object.keys(zip.files).length);
    
    // Remove 404.html and 404.css files
    Object.keys(zip.files).forEach(filename => {
      if (filename === '404.html' || filename === '404.css') {
        zip.remove(filename);
      }
    });
    
    // Add JS files 
    for (const [filename, content] of Object.entries(JS_CONTENT)) {
      zip.file(filename, content);
      console.log(`Added JS file: ${filename}`);
    }
    
    // Check if public folder exists and handle renaming
    const publicFiles = Object.keys(zip.files).filter(filename => 
      filename.startsWith('public/') || filename === 'public'
    );
    
    if (publicFiles.length > 0) {
      console.log(`Found ${publicFiles.length} files in public folder, renaming to img/`);
      
      // Create an async task for each file to be copied
      const copyPromises = publicFiles.map(async (publicPath) => {
        const file = zip.files[publicPath];
        if (!file) return;
        
        const imgPath = publicPath === 'public' ? 'img' : publicPath.replace('public/', 'img/');
        
        if (file.dir) {
          zip.folder(imgPath);
        } else {
          try {
            const content = await file.async('arraybuffer');
            zip.file(imgPath, content);
          } catch (error) {
            console.error(`Error copying file ${publicPath} to ${imgPath}:`, error);
          }
        }
      });
      
      // Wait for all copy operations to complete
      await Promise.all(copyPromises);
      
      // Remove the original public/ files/folders after copying
      for (const publicPath of publicFiles) {
        zip.remove(publicPath);
      }
      
      console.log("Renamed public/ folder to img/");
    }
    
    // Handle CSS files separately to update image references
    const cssFiles = Object.keys(zip.files).filter(filename => 
      filename.toLowerCase().endsWith(".css") && !zip.files[filename].dir
    );
    
    console.log(`Found ${cssFiles.length} CSS files to process`);
    
    const cssFilesPromises = cssFiles.map(async (filename) => {
      const file = zip.files[filename];
      const content = await file.async("text");
      
      // Replace all references to public/ with img/ in CSS files
      const updatedContent = content.replace(/public\//g, 'img/');
      
      // Update the file in the ZIP
      zip.file(filename, updatedContent);
    });
    
    // Wait for all CSS files to be processed
    await Promise.all(cssFilesPromises);
    
    let elementsProcessed = 0;
    let attributesAdded = 0;
    
    // Process HTML files
    const htmlFiles = Object.keys(zip.files).filter(filename => 
      filename.toLowerCase().endsWith(".html") && !zip.files[filename].dir
    );
    
    console.log(`Found ${htmlFiles.length} HTML files to process`);
    
    if (htmlFiles.length === 0) {
      console.log('No HTML files found in the ZIP!');
    }
    
    const filePromises = htmlFiles.map(async (filename) => {
      try {
        const file = zip.files[filename];
        
        // Read and parse HTML content
        const content = await file.async("text");
        const { window } = new JSDOM(content);
        const document = window.document;
        
        console.log(`Processing HTML file: ${filename}, size: ${content.length} bytes`);
        
        // Update all references from public/ to img/
        document.querySelectorAll('img[src^="public/"]').forEach(img => {
          const src = img.getAttribute('src');
          if (src) img.setAttribute('src', src.replace(/public\//g, 'img/'));
        });
        
        // Remove external connections (Google Fonts, unpkg)
        const externalLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="unpkg.com"]');
        externalLinks.forEach(link => {
          link.parentNode?.removeChild(link);
        });
        
        // Add custom code to head
        const headElement = document.head;
        const customHeadCode = `
<!--custom code 1-->
<script type="text/javascript" src="LLWebServerExtended.js"></script>
<script type='text/javascript' src='../js/base.js'></script>
<link rel='stylesheet' type='text/css' href='../style/common.css'>
<!--custom code 2-->
<script type="text/javascript" src="ew-log-viewer.js"></script>
<script type="text/javascript" src="envelope-cartesian.js"></script>
`;
        headElement.insertAdjacentHTML('beforeend', customHeadCode);
        
        // Add custom code to end of body
        const bodyElement = document.body;
        const customBodyCode = `
<!--custom code 3-->
<script type='text/javascript'>
    LLWebServer.AutoRefreshStart(1000);
    showLoginStatus();
    localStorage.setItem("showNeutralNavbar", true);
</script>
<script>
    document.addEventListener('DOMContentLoaded', init);
</script>
<script
      defer=""
      src="scriptcustom.js"
></script>
`;
        bodyElement.insertAdjacentHTML('beforeend', customBodyCode);
        
        // Find all elements with nv attribute
        const elementsWithNvAttr = document.querySelectorAll("[nv]");
        console.log(`Found ${elementsWithNvAttr.length} elements with nv attribute in ${filename}`);
        
        elementsWithNvAttr.forEach((element) => {
          const nvValue = element.getAttribute("nv");
          if (!nvValue) return;
          
          console.log(`Processing element with nv="${nvValue}"`);
          
          // Find matching CSV row
          const matchingRow = findMatchingCSVRow(csvData, nvValue);
          
          if (matchingRow) {
            console.log(`Found matching CSV row for nv="${nvValue}"`);
            elementsProcessed++;
            
            // Apply appropriate attributes based on element type
            if (element.tagName === "INPUT") {
              // Handle input elements
              const inputType = element.getAttribute("type");
              
              if (inputType === "checkbox") {
                processCheckboxElement(element, matchingRow);
                attributesAdded += 3;
              } else if (inputType === "radio") {
                processRadioElement(element, matchingRow);
                attributesAdded += 4; // name, data-llweb-par, data-llweb-refresh, id
              } else {
                processInputElement(element, matchingRow);
                attributesAdded += 3;
              }
            } else if (element.tagName === "SELECT") {
              processSelectElement(element, matchingRow);
              attributesAdded += 3;
            } else if (element.tagName === "BUTTON") {
              processButtonElement(element, matchingRow);
              attributesAdded += 3;
            }
          } else {
            console.log(`No matching CSV row found for nv="${nvValue}"`);
          }
        });
        
        // Update file content in ZIP
        return zip.file(filename, "<!DOCTYPE html>\n" + document.documentElement.outerHTML);
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        return;
      }
    });
    
    // Wait for all files to be processed
    await Promise.all(filePromises);
    
    console.log(`Processed ${elementsProcessed} elements with ${attributesAdded} attributes added`);
    
    // Generate a new ZIP with the name website.zip
    const modifiedZipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      comment: "Generated website package"
    });
    
    // Return results
    return res.json({
      zipBuffer: modifiedZipBuffer,
      stats: {
        elementsProcessed,
        attributesAdded
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
}

// Export handler for Vercel serverless function
export default app;