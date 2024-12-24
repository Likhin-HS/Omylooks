// Get modal and buttons
const modal = document.getElementById('upload-modal');
const closeButton = document.querySelector('.close-button');
const cameraButton = document.getElementById('camera-button');
const galleryButton = document.getElementById('gallery-button');

// Elements for camera and gallery sections
const cameraSection = document.createElement('div');
const gallerySection = document.createElement('div');

// Show the modal directly without needing an initial upload button
modal.style.display = 'flex'; // Show the modal

// Navigate to the previous page when the close button is clicked
closeButton.addEventListener('click', () => {
  window.history.back(); // Navigate to the previous page
});

// Function to stop the camera
function stopCamera(videoElement) {
  const stream = videoElement.srcObject;
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop()); // Stop each track
    videoElement.srcObject = null; // Disconnect the video element
  }
}

// Handle the camera button click (open camera)
cameraButton.addEventListener('click', () => {
  modal.style.display = 'none'; // Close the modal

  // Create camera preview section
  cameraSection.innerHTML = `
    <div id="camera-section" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #abc4ff; border-radius: 10px; padding: 20px; position: relative;">
      <h3 style="margin-bottom: 20px;">Capture a Photo</h3>
      <div id="camera-container" style="display: flex; flex-direction: column; align-items: center;">
        <video id="camera-feed" autoplay style="max-width: 90%; max-height: 100vh; background: #000;"></video>
        <canvas id="captured-photo" style="display: none; max-width: 90%; max-height: 100vh; margin-top: 20px;"></canvas>
        <div style="margin-top: 20px;">
          <button id="capture-photo" style="background: #4CAF50; color: white;">Capture Photo</button>
          <button id="back-to-upload" style="background:rgb(116, 116, 116); color: white;">Back</button>
          <button id="retry-photo" style="display: none; margin-left: 10px; background:rgb(210, 49, 49); color: white;">Retry</button>
          <button id="accept-photo" style="display: none; margin-left: 10px; background: #4CAF50; color: white;">Accept Photo</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(cameraSection);

  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('captured-photo');
  const captureButton = document.getElementById('capture-photo');
  const retryButton = document.getElementById('retry-photo');
  const acceptButton = document.getElementById('accept-photo');
  const backButton = document.getElementById('back-to-upload');

  // Open the camera and display the video feed
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Could not access the camera: " + err);
    });

  // Capture photo and scale it to fit the container
  captureButton.addEventListener('click', () => {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight); // Capture the image at the video resolution

    // Hide video feed and show captured photo
    video.style.display = 'none';
    canvas.style.display = 'block';

    // Update button visibility
    captureButton.style.display = 'none';
    retryButton.style.display = 'inline';
    acceptButton.style.display = 'inline';

    backButton.style.display = 'none'; // Hide the back button
  });

  // Retry photo
  retryButton.addEventListener('click', () => {
    video.style.display = 'block'; // Show video feed
    canvas.style.display = 'none'; // Hide captured photo

    // Update button visibility
    captureButton.style.display = 'inline';
    retryButton.style.display = 'none';
    acceptButton.style.display = 'none';

    backButton.style.display = 'inline'; // Show the back button
  });

  // Accept the captured photo and proceed
  acceptButton.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png'); // Convert canvas to Base64
    localStorage.setItem('uploadedImage', imageData); // Save in localStorage
    stopCamera(video); // Stop the camera
    window.location.href = 'edit-photo.html'; // Redirect
  });

  // Back to upload modal
  backButton.addEventListener('click', () => {
    stopCamera(video); // Stop the camera
    cameraSection.remove(); // Remove camera section
    modal.style.display = 'flex'; // Show the modal
  });
});

// Handle the gallery button click (open gallery)
galleryButton.addEventListener('click', () => {
  modal.style.display = 'none'; // Close the modal

  // Create gallery upload section
  gallerySection.innerHTML = `
    <div id="gallery-section" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #abc4ff; border-radius: 10px; padding: 20px; position: relative;">
      <h3 style="margin-bottom: 20px;">Select an Image from Gallery</h3>
      <label for="gallery-input" style="background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">Choose File</label>
      <input type="file" id="gallery-input" accept="image/*" style="display: none;">
      <div id="image-preview" style="max-width: 90%; overflow: hidden; text-align: center;">
        <p>No image selected</p>
      </div>
      <div style="margin-top: 20px">
        <button id="submit-gallery" style="display: none; margin-top: 20px; background: #4CAF50; color: white;">Submit Image</button>
        <button id="back-to-upload-gallery" style="margin-top: 20px; margin-bottom: 40px; background:rgb(116, 116, 116); color: white;">Back</button>
      </div>
    </div>
  `;
  document.body.appendChild(gallerySection);

  const galleryInput = document.getElementById('gallery-input');
  const imagePreview = document.getElementById('image-preview');
  const submitButton = document.getElementById('submit-gallery');
  const backButtonGallery = document.getElementById('back-to-upload-gallery');

  // Handle file input for image selection
  galleryInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Selected Image" style="max-width: 100%; max-height: 66vh; object-fit: contain;">`;
        submitButton.style.display = 'block'; // Show the submit button
      };
      reader.readAsDataURL(file); // Read the file as Data URL for preview
    }
  });

  // Handle submit button click
  submitButton.addEventListener('click', () => {
    const file = galleryInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        localStorage.setItem('uploadedImage', event.target.result); // Save Base64 in localStorage
        window.location.href = 'edit-photo.html'; // Redirect to description page
      };
      reader.readAsDataURL(file); // Read file as Base64
    } else {
      alert("Please upload an image before submitting.");
    }
  });

  // Back to upload modal
  backButtonGallery.addEventListener('click', () => {
    gallerySection.remove(); // Remove gallery section
    modal.style.display = 'flex'; // Show the modal
  });
});
