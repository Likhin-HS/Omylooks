
/*
Copyright 2024 Likhin H S

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const fs = require('fs');
const path = require('path');

// License Header (replace this with the exact header you added earlier)
const licenseHeader = `
/*
Copyright 2024 Likhin H S

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
`;

// Function to remove license header from files
function removeLicenseFromFiles(directory, extensions) {
  // Read the directory
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${directory}`, err);
      return;
    }

    // Loop through each file
    files.forEach((file) => {
      const filePath = path.join(directory, file);

      // Check if it's a directory
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // Process subdirectories (including node_modules)
        removeLicenseFromFiles(filePath, extensions);
      } else if (extensions.includes(path.extname(file))) {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // If the file starts with the license header, remove it
        if (content.startsWith(licenseHeader)) {
          const newContent = content.replace(licenseHeader, '');
          fs.writeFileSync(filePath, newContent);
          console.log(`Removed license header from: ${filePath}`);
        }
      }
    });
  });
}

// Target directory (starting point for scanning)
const targetDirectory = './'; // Root directory of your project
const fileExtensions = ['.js', '.html', '.css']; // File types to process (you can add more as needed)

removeLicenseFromFiles(targetDirectory, fileExtensions);
