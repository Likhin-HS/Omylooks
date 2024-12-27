
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
// Mapping of country codes to country names
const countryMapping = {
  "AF": "Afghanistan",
  "AL": "Albania",
  "DZ": "Algeria",
  "AD": "Andorra",
  "AO": "Angola",
  "AR": "Argentina",
  "AM": "Armenia",
  "AU": "Australia",
  "AT": "Austria",
  "AZ": "Azerbaijan",
  "BS": "Bahamas",
  "BH": "Bahrain",
  "BD": "Bangladesh",
  "BB": "Barbados",
  "BY": "Belarus",
  "BE": "Belgium",
  "BZ": "Belize",
  "BJ": "Benin",
  "BT": "Bhutan",
  "BO": "Bolivia",
  "BA": "Bosnia and Herzegovina",
  "BW": "Botswana",
  "BR": "Brazil",
  "BN": "Brunei",
  "BG": "Bulgaria",
  "BF": "Burkina Faso",
  "BI": "Burundi",
  "KH": "Cambodia",
  "CM": "Cameroon",
  "CA": "Canada",
  "CV": "Cape Verde",
  "CF": "Central African Republic",
  "TD": "Chad",
  "CL": "Chile",
  "CN": "China",
  "CO": "Colombia",
  "KM": "Comoros",
  "CG": "Congo",
  "CR": "Costa Rica",
  "CI": "Côte d'Ivoire",
  "HR": "Croatia",
  "CU": "Cuba",
  "CY": "Cyprus",
  "CZ": "Czech Republic",
  "DK": "Denmark",
  "DJ": "Djibouti",
  "DM": "Dominica",
  "DO": "Dominican Republic",
  "EC": "Ecuador",
  "EG": "Egypt",
  "SV": "El Salvador",
  "GQ": "Equatorial Guinea",
  "ER": "Eritrea",
  "EE": "Estonia",
  "ET": "Ethiopia",
  "FJ": "Fiji",
  "FI": "Finland",
  "FR": "France",
  "GA": "Gabon",
  "GM": "Gambia",
  "GE": "Georgia",
  "DE": "Germany",
  "GH": "Ghana",
  "GR": "Greece",
  "GD": "Grenada",
  "GT": "Guatemala",
  "GN": "Guinea",
  "GW": "Guinea-Bissau",
  "GY": "Guyana",
  "HT": "Haiti",
  "HN": "Honduras",
  "HU": "Hungary",
  "IS": "Iceland",
  "IN": "India",
  "ID": "Indonesia",
  "IR": "Iran",
  "IQ": "Iraq",
  "IE": "Ireland",
  "IL": "Israel",
  "IT": "Italy",
  "JM": "Jamaica",
  "JP": "Japan",
  "JO": "Jordan",
  "KZ": "Kazakhstan",
  "KE": "Kenya",
  "KI": "Kiribati",
  "KP": "North Korea",
  "KR": "South Korea",
  "KW": "Kuwait",
  "KG": "Kyrgyzstan",
  "LA": "Laos",
  "LV": "Latvia",
  "LB": "Lebanon",
  "LS": "Lesotho",
  "LR": "Liberia",
  "LY": "Libya",
  "LI": "Liechtenstein",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "MG": "Madagascar",
  "MW": "Malawi",
  "MY": "Malaysia",
  "MV": "Maldives",
  "ML": "Mali",
  "MT": "Malta",
  "MH": "Marshall Islands",
  "MR": "Mauritania",
  "MU": "Mauritius",
  "MX": "Mexico",
  "FM": "Micronesia",
  "MD": "Moldova",
  "MC": "Monaco",
  "MN": "Mongolia",
  "ME": "Montenegro",
  "MA": "Morocco",
  "MZ": "Mozambique",
  "MM": "Myanmar",
  "NA": "Namibia",
  "NR": "Nauru",
  "NP": "Nepal",
  "NL": "Netherlands",
  "NZ": "New Zealand",
  "NI": "Nicaragua",
  "NE": "Niger",
  "NG": "Nigeria",
  "NO": "Norway",
  "OM": "Oman",
  "PK": "Pakistan",
  "PW": "Palau",
  "PS": "Palestine",
  "PA": "Panama",
  "PG": "Papua New Guinea",
  "PY": "Paraguay",
  "PE": "Peru",
  "PH": "Philippines",
  "PL": "Poland",
  "PT": "Portugal",
  "QA": "Qatar",
  "RO": "Romania",
  "RU": "Russia",
  "RW": "Rwanda",
  "WS": "Samoa",
  "SM": "San Marino",
  "SA": "Saudi Arabia",
  "SN": "Senegal",
  "RS": "Serbia",
  "SC": "Seychelles",
  "SL": "Sierra Leone",
  "SG": "Singapore",
  "SK": "Slovakia",
  "SI": "Slovenia",
  "SB": "Solomon Islands",
  "SO": "Somalia",
  "ZA": "South Africa",
  "ES": "Spain",
  "LK": "Sri Lanka",
  "SD": "Sudan",
  "SR": "Suriname",
  "SE": "Sweden",
  "CH": "Switzerland",
  "SY": "Syria",
  "TW": "Taiwan",
  "TJ": "Tajikistan",
  "TZ": "Tanzania",
  "TH": "Thailand",
  "TL": "Timor-Leste",
  "TG": "Togo",
  "TO": "Tonga",
  "TT": "Trinidad and Tobago",
  "TN": "Tunisia",
  "TR": "Turkey",
  "TM": "Turkmenistan",
  "TV": "Tuvalu",
  "UG": "Uganda",
  "UA": "Ukraine",
  "AE": "United Arab Emirates",
  "US": "United States",
  "UY": "Uruguay",
  "UZ": "Uzbekistan",
  "VU": "Vanuatu",
  "VE": "Venezuela",
  "VN": "Vietnam",
  "YE": "Yemen",
  "ZM": "Zambia",
  "ZW": "Zimbabwe"
};

document.addEventListener("DOMContentLoaded", () => {
  // Initially hide the details box by default
  const detailsBox = document.getElementById("photo-details-box");
  detailsBox.classList.add("hidden"); // Ensure it's hidden by default

  // Fetch a random photo on page load
  function fetchRandomPhoto() {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      return;
    }

    axios
      .get("https://omylooks.onrender.com/random-photo", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const photoElement = document.getElementById("photo");
        photoElement.src = response.data.photoUrl;
        photoElement.alt = "Photo to rate";
        photoElement.dataset.userId = response.data.userId; // Add user ID to dataset

        // Display user profile picture and username
        const userProfileContainer = document.getElementById("user-profile-container");
        const userProfilePicture = document.getElementById("user-profile-picture");
        const userProfileUsername = document.getElementById("user-profile-username");
        userProfilePicture.src = response.data.profilePictureUrl;
        userProfileUsername.textContent = response.data.username;

        // Store photoId and details for later use
        window.currentPhotoId = response.data.photoId;
        window.currentUserId = response.data.userId; // Store user ID
        const { country, height, build, profession } = response.data;
        updatePhotoDetails(country, height, build, profession);
      })
      .catch((error) => {
        console.error("Error fetching photo:", error);
        alert("Error fetching photo. Please try again.");
      });
  }

  // Function to update the details box
  function updatePhotoDetails(country, height, build, profession) {
    detailsBox.innerHTML = ""; // Clear existing content

    const details = [
      { label: "Country", value: countryMapping[country] || country }, // Use full country name
      { label: "Height", value: height ? `${height} cm` : height }, // Add 'cm' after height
      { label: "Build", value: build },
      { label: "Profession", value: profession },
    ];

    // Add only non-N/A details to the box
    let hasValidDetails = false;
    details.forEach((detail) => {
      if (detail.value) {
        hasValidDetails = true;
        const detailElement = document.createElement("p");
        detailElement.innerHTML = `<strong>${detail.label}:</strong> ${detail.value}`;
        detailsBox.appendChild(detailElement);
      }
    });
  }

  // Toggle the details box visibility when the "Details" button is clicked
  document.getElementById("details-dropdown-btn").addEventListener("click", () => {
    // Toggle the visibility state of the details box
    detailsBox.classList.toggle("hidden");
  });

  // Handle Next Photo button click
  document.getElementById("next-photo-btn").addEventListener("click", function () {
    const rating = document.getElementById("rating-input").value;
    if (rating >= 1 && rating <= 10) {
      if (window.currentPhotoId) {
        submitRating(window.currentPhotoId, rating);
      } else {
        alert("Error: No photo loaded.");
      }
    } else {
      alert("Please enter a rating between 1 and 10.");
    }
  });

  // Function to submit the rating to the server
  function submitRating(photoId, rating) {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      return;
    }

    axios
      .post(
        "https://omylooks.onrender.com/rate-photo",
        {
          photoId,
          rating,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((response) => {
        console.log("Rating submitted:", response.data);
        showFeedbackModal(response.data.yourRating, response.data.averageRating, response.data.totalRatings);
      })
      .catch((error) => {
        console.error("Error submitting rating:", error);
        alert("Error submitting rating. Please try again.");
      });
  }

  // Function to create and display the feedback modal
  function showFeedbackModal(myRating, averageRating, totalRatings) {
    // Create modal container
    const modal = document.createElement("div");
    modal.id = "feedback-modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "1000";

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "#fff";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "8px";
    modalContent.style.textAlign = "center";
    modalContent.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
    modalContent.innerHTML = `
      <p><strong>My Rating:</strong> ${myRating || "N/A"}</p>
      <p><strong>Average Rating:</strong> ${averageRating || "N/A"}</p>
      <p><strong>Total Ratings Received:</strong> ${totalRatings || "N/A"}</p>
      <button id="close-modal-btn" style="margin-top: 15px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 5px;">OK</button>
    `;

    // Append modal content to modal
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add event listener to close the modal
    document.getElementById("close-modal-btn").addEventListener("click", () => {
      document.body.removeChild(modal);
      fetchRandomPhoto(); // Fetch a new random photo after dismissing the modal
    });
  }

  // Update the displayed value when the slider is changed
  document.getElementById("rating-input").addEventListener("input", function (event) {
    const ratingValue = event.target.value;
    document.getElementById("slider-box").textContent = ratingValue;
  });

  // Initial photo load
  fetchRandomPhoto();
});

function fetchPhotos(userId) {
  const token = localStorage.getItem('token'); 
  
  fetch(`https://omylooks.onrender.com/profile/${userId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    const photoGrid = document.getElementById('photo-grid');
    photoGrid.innerHTML = '';

    data.reverse().forEach(photo => {
      const photoItem = document.createElement('div');
      photoItem.classList.add('photo');
      photoItem.dataset.userId = photo.userId; // Add user ID to dataset
      photoItem.dataset.country = photo.country;
      photoItem.dataset.height = photo.height;
      photoItem.dataset.build = photo.build;
      photoItem.dataset.profession = photo.profession;

      // ...existing code...
    });
  })
  .catch(error => console.error('Error fetching photos:', error));
}
