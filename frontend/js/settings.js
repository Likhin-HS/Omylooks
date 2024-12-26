
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
function confirmRemoveProfilePicture() {
  if (confirm("Are you sure you want to remove your profile picture?")) {
    const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
    fetch('http://localhost:3000/remove-profile-picture', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.message) {
        alert(data.message);
      } else {
        alert('Failed to remove profile picture');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while removing the profile picture');
    });
  }
}

function openModal() {
  document.getElementById('delete-account-modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('delete-account-modal').style.display = 'none';
}
