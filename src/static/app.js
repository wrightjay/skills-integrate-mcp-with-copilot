document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeBtn = document.querySelector(".close-btn");
  const userInfo = document.getElementById("user-info");
  const loginMessage = document.getElementById("login-message");
  const categoryFilter = document.getElementById("category-filter");
  const sortBy = document.getElementById("sort-by");
  const searchBox = document.getElementById("search-box");

  // Authentication state
  let isAuthenticated = false;
  let teacherEmail = "";
  let teacherPassword = "";

  // Show login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("teacher-email").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch(
        `/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        isAuthenticated = true;
        teacherEmail = email;
        teacherPassword = password;

        loginMessage.textContent = result.message;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");

        // Update UI
        loginBtn.classList.add("hidden");
        userInfo.textContent = `Logged in as ${email}`;
        userInfo.classList.remove("hidden");
        logoutBtn.classList.remove("hidden");

        // Close modal after 1 second
        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginForm.reset();
          loginMessage.classList.add("hidden");
        }, 1000);

        // Refresh activities to show admin buttons
        fetchActivities();
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    isAuthenticated = false;
    teacherEmail = "";
    teacherPassword = "";

    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
    logoutBtn.classList.add("hidden");

    // Refresh activities to hide admin buttons
    fetchActivities();
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (categoryFilter.value) {
        params.append("category", categoryFilter.value);
      }
      if (searchBox.value) {
        params.append("search", searchBox.value);
      }

      const url = `/activities${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      let activities = await response.json();

      // Sort activities
      activities = sortActivities(activities, sortBy.value);

      // Clear loading message
      activitiesList.innerHTML = "";

      // Check if no activities found
      if (Object.keys(activities).length === 0) {
        activitiesList.innerHTML = "<p>No activities found matching your criteria.</p>";
        return;
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${isAuthenticated ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        // Add register button if authenticated
        const registerButton = isAuthenticated
          ? `<button class="register-btn" data-activity="${name}">Register Student</button>`
          : "";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Category:</strong> ${details.category || 'General'}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${registerButton}
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to delete buttons
      if (isAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });

        // Add event listeners to register buttons
        document.querySelectorAll(".register-btn").forEach((button) => {
          button.addEventListener("click", handleRegister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Sort activities
  function sortActivities(activities, sortType) {
    const entries = Object.entries(activities);
    
    switch (sortType) {
      case "name":
        entries.sort((a, b) => a[0].localeCompare(b[0]));
        break;
      case "schedule":
        entries.sort((a, b) => a[1].schedule.localeCompare(b[1].schedule));
        break;
      case "availability":
        entries.sort((a, b) => {
          const availA = a[1].max_participants - a[1].participants.length;
          const availB = b[1].max_participants - b[1].participants.length;
          return availB - availA;
        });
        break;
    }
    
    return Object.fromEntries(entries);
  }

  // Handle register functionality
  async function handleRegister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    // Prompt for student email
    const email = prompt("Enter student email:");
    if (!email) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&teacher_email=${encodeURIComponent(
          teacherEmail
        )}&teacher_password=${encodeURIComponent(teacherPassword)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        fetchActivities();
      } else {
        alert(result.detail || "An error occurred");
      }
    } catch (error) {
      alert("Failed to register student. Please try again.");
      console.error("Error registering:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!confirm(`Are you sure you want to unregister ${email} from ${activity}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&teacher_email=${encodeURIComponent(
          teacherEmail
        )}&teacher_password=${encodeURIComponent(teacherPassword)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        fetchActivities();
      } else {
        alert(result.detail || "An error occurred");
      }
    } catch (error) {
      alert("Failed to unregister. Please try again.");
      console.error("Error unregistering:", error);
    }
  }

  // Add event listeners for filters
  categoryFilter.addEventListener("change", fetchActivities);
  sortBy.addEventListener("change", fetchActivities);
  searchBox.addEventListener("input", debounce(fetchActivities, 300));

  // Debounce function for search
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize app
  fetchActivities();
});
