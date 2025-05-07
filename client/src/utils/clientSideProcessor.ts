import JSZip from 'jszip';
import Papa from 'papaparse';

// Tipos para os dados CSV
type CSVData = {
  filename: string;
  data: Record<string, string>[];
};

// Tipos para o resultado do processamento
type ProcessingResult = {
  zipBuffer: ArrayBuffer;
  stats: {
    elementsProcessed: number;
    attributesAdded: number;
  };
};

// Scripts JS a serem incluídos
const JS_CONTENT = {
  "LLWebServerExtended.js": `/*****************
* LLWebServer    *
* Version 1.2.0 **
* 2025/02/14     *
*******************/

const LLWebServer = {
  AutoRefreshStart: function(interval) {
    console.log('AutoRefresh started with interval:', interval);
  }
};

function showLoginStatus() {
  console.log('Login status shown');
}`,
  "envelope-cartesian.js": `/**
 * Envelope cartesian coordinate system generator
 */
function init() {
  console.log('Envelope cartesian initialized');
}`,
  "ew-log-viewer.js": `// Log viewer script
console.log('Log viewer initialized');`,
  "scriptcustom.js": `// Custom script for the application
console.log('Custom script loaded');`
};

/**
 * Parse multiple CSV files and return their data
 */
async function parseCSVFiles(csvFiles: File[]): Promise<CSVData[]> {
  if (!csvFiles || csvFiles.length === 0) {
    return [];
  }

  const parsedData: CSVData[] = [];

  for (const csvFile of csvFiles) {
    // Read file content as text
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(csvFile);
    });
    
    // Parse CSV content
    const parseResult = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.data && parseResult.data.length > 0) {
      console.log(`Parsed CSV file: ${csvFile.name}, rows: ${parseResult.data.length}`);
      console.log('Sample row:', parseResult.data[0]);
      parsedData.push({
        filename: csvFile.name,
        data: parseResult.data as Record<string, string>[],
      });
    }
  }

  return parsedData;
}

/**
 * Find a matching row in the CSV data based on the NV value
 */
function findMatchingCSVRow(
  csvData: CSVData[],
  nvValue: string | null
): Record<string, string> | null {
  if (!nvValue || !csvData || csvData.length === 0) {
    return null;
  }

  console.log(`Looking for nv value: ${nvValue}`);
  
  // Normalize the NV value (lowercase and trim)
  const normalizedNvValue = nvValue.toLowerCase().trim();
  
  // Try to find a match in any CSV file
  for (const csv of csvData) {
    console.log(`Scanning CSV file: ${csv.filename}, rows: ${csv.data.length}`);
    
    // 1. First try exact match on any column
    for (const row of csv.data) {
      // Try all columns in the CSV row
      for (const [key, value] of Object.entries(row)) {
        if (!value) continue;
        
        const normalizedValue = value.toString().toLowerCase().trim();
        if (normalizedValue === normalizedNvValue) {
          console.log(`Found exact match in column ${key}`);
          return row;
        }
      }
    }
    
    // 2. Then try matching on specific columns that might contain address data
    for (const row of csv.data) {
      const potentialColumns = Object.keys(row).filter(key => 
        key.toLowerCase().includes('address') || 
        key.toLowerCase().includes('variable') || 
        key.toLowerCase().includes('var') ||
        key.toLowerCase() === 'addr' || 
        key.toLowerCase() === 'nv')
      
      for (const col of potentialColumns) {
        const value = row[col];
        if (!value) continue;
        
        const normalizedValue = value.toString().toLowerCase().trim();
        if (normalizedValue === normalizedNvValue) {
          console.log(`Found match in address-like column ${col}`);
          return row;
        }
      }
    }
    
    // 3. Try numeric comparison if NV value looks like a number
    if (/^\d+$/.test(normalizedNvValue)) {
      const numericNvValue = parseInt(normalizedNvValue, 10);
      
      for (const row of csv.data) {
        for (const [key, value] of Object.entries(row)) {
          if (!value) continue;
          
          // Try to parse as number if it looks like one
          if (/^\d+$/.test(value.toString().trim())) {
            const numericValue = parseInt(value.toString().trim(), 10);
            if (numericValue === numericNvValue) {
              console.log(`Found numeric match in column ${key}: ${numericValue} = ${numericNvValue}`);
              return row;
            }
          }
        }
      }
    }
  }

  console.log(`No match found for nv=${nvValue} in any CSV file`);
  return null;
}

/**
 * Process a checkbox input element with CSV data
 */
function processCheckboxElement(
  element: HTMLInputElement,
  csvRow: Record<string, string>
): void {
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
    element.setAttribute("data-llweb-format", csvRow[formatKey]);
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a radio input element with CSV data
 */
function processRadioElement(
  element: HTMLInputElement,
  csvRow: Record<string, string>
): void {
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
function processInputElement(
  element: HTMLInputElement,
  csvRow: Record<string, string>
): void {
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
    element.setAttribute("data-llweb-format", csvRow[formatKey]);
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a select element with CSV data
 */
function processSelectElement(
  element: HTMLSelectElement,
  csvRow: Record<string, string>
): void {
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
    element.setAttribute("data-llweb-format", csvRow[formatKey]);
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process a button element with CSV data
 */
function processButtonElement(
  element: HTMLButtonElement,
  csvRow: Record<string, string>
): void {
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
    element.setAttribute("data-llweb-format", csvRow[formatKey]);
  } else {
    element.setAttribute("data-llweb-format", "");
  }
}

/**
 * Process ZIP and CSV files directly in the browser
 */
export async function processFilesInBrowser(
  zipFile: File,
  csvFiles: File[]
): Promise<ProcessingResult> {
  console.log('Processing files client-side...');
  console.log('ZIP:', zipFile.name, 'size:', zipFile.size);
  console.log('CSV files:', csvFiles.map(f => f.name).join(', '));
  
  try {
    // Parse CSV files
    const csvData = await parseCSVFiles(csvFiles);
    console.log('CSV data parsed, found rows:', csvData.reduce((acc, csv) => acc + csv.data.length, 0));
    
    // Load ZIP file
    const zipArrayBuffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.readAsArrayBuffer(zipFile);
    });
    
    // Extract the ZIP
    const zip = await JSZip.loadAsync(zipArrayBuffer);
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
        
        // Use DOMParser instead of JSDOM (browser compatible)
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        
        console.log(`Processing HTML file: ${filename}, size: ${content.length} bytes`);
        
        // Debug: Log all attributes of all elements to check for nv attributes
        const allElements = doc.querySelectorAll('*');
        console.log(`Total elements in ${filename}: ${allElements.length}`);
        
        let nvFound = false;
        allElements.forEach((el: Element) => {
          if (el.hasAttribute('nv')) {
            console.log(`Found element with nv="${el.getAttribute('nv')}", tag: ${el.tagName}`);
            nvFound = true;
          }
        });
        
        if (!nvFound) {
          console.log(`No elements with nv attribute found in ${filename}`);
        }
        
        // Update all references from public/ to img/
        doc.querySelectorAll('img[src^="public/"]').forEach((img: Element) => {
          const src = img.getAttribute('src');
          if (src) img.setAttribute('src', src.replace(/public\//g, 'img/'));
        });
        
        // Remove external connections (Google Fonts, unpkg)
        const externalLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="unpkg.com"]');
        externalLinks.forEach((link: Element) => {
          link.parentNode?.removeChild(link);
        });
        
        // Add custom code to head
        const headElement = doc.head;
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
        const bodyElement = doc.body;
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
        const elementsWithNvAttr = doc.querySelectorAll("[nv]");
        console.log(`Found ${elementsWithNvAttr.length} elements with nv attribute in ${filename}`);
        
        elementsWithNvAttr.forEach((element: Element) => {
          const nvValue = element.getAttribute("nv");
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
                processCheckboxElement(element as HTMLInputElement, matchingRow);
                attributesAdded += 3;
              } else if (inputType === "radio") {
                processRadioElement(element as HTMLInputElement, matchingRow);
                attributesAdded += 4; // name, data-llweb-par, data-llweb-refresh, id
              } else {
                processInputElement(element as HTMLInputElement, matchingRow);
                attributesAdded += 3;
              }
            } else if (element.tagName === "SELECT") {
              processSelectElement(element as HTMLSelectElement, matchingRow);
              attributesAdded += 3;
            } else if (element.tagName === "BUTTON") {
              processButtonElement(element as HTMLButtonElement, matchingRow);
              attributesAdded += 3;
            }
          } else {
            console.log(`No matching CSV row found for nv="${nvValue}"`);
          }
        });
        
        // Convert the document to string
        const serializer = new XMLSerializer();
        const docString = "<!DOCTYPE html>\n" + serializer.serializeToString(doc);
        
        // Update file content in ZIP
        return zip.file(filename, docString);
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
      type: "arraybuffer",
      compression: "DEFLATE",
      comment: "Generated website package"
    });
    
    // Return results
    return {
      zipBuffer: modifiedZipBuffer,
      stats: {
        elementsProcessed,
        attributesAdded
      }
    };
  } catch (error) {
    console.error('Error processing files:', error);
    throw new Error(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}