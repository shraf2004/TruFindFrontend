// ✅✅✅ TruFind script.js — Frontend

function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("expiresAt");
    sessionStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    window.location.replace("index.html");
}

function endSession() {
    alert("Your session has expired. Please log in again.");
    logout();
}

function sessionHasExpired() {
    const expiresAt = Number(sessionStorage.getItem("expiresAt"));
    return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

async function authenticatedRequest(url, options) {
    const token = sessionStorage.getItem("token");
    if (!token || sessionHasExpired()) {
        endSession();
        return;
    }

    const response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) {
        endSession();
        return;
    }
    return response.json();
}

async function validForm() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (name === "" || /\d/.test(name)) return alert("Invalid name");
    if (!email.endsWith("@truman.edu")) return alert("Email must end with @truman.edu");

    const response = await fetch("https://100.55.59.69/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password })
    });

    const data = await response.json();
    if (data.success) {
        localStorage.setItem("verifyingEmail", email);
        window.location.href = "code.html";
    } else {
        alert("❌ Failed to send verification email");
    }
}

async function verifyCode() {
    const code = document.getElementById("codeInput").value.trim();
    const email = localStorage.getItem("verifyingEmail");

    const response = await fetch("https://100.55.59.69/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
    });

    const data = await response.json();
    if (data.success) {
        window.location.href = "index.html";
    } else {
        alert("❌ Incorrect code");
    }
}

async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();

    const response = await fetch("https://100.55.59.69/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
    });

    const data = await response.json();
    if (data.success) {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("expiresAt", data.expiresAt);
        sessionStorage.setItem("userId", data.id);
        window.location.href = "Home.html";
    } else {
        alert("Invalid credentials");
    }
}

const fileInput = document.getElementById("fileInput");
const fileNameSpan = document.getElementById("fileName");
if (fileInput && fileNameSpan) {
    fileInput.addEventListener("change", () => {
        fileNameSpan.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : "";
    });
}

const postForm = document.getElementById("postForm");
const postText = document.getElementById("postText");
if (postForm) {
    postForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append("title", "Post");
        formData.append("description", postText.value);

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const allowed = ["image/jpeg", "image/png", "image/webp"];
            if (!allowed.includes(file.type)) return alert("Invalid file type");
            formData.append("image", file);
        }

        const result = await authenticatedRequest("https://100.55.59.69/posts", {
            method: "POST",
            body: formData
        });

        if (!result) return;
        if (result.success) {
            alert("Post saved");
            window.location.reload();
        } else {
            alert("Post failed");
        }
    });
}

async function getAllPosts() {
    const response = await fetch("https://100.55.59.69/all-posts");
    const data = await response.json();
    const container = document.getElementById("postContainer");
    const currentUser = sessionStorage.getItem("userId");

    if (data.success) {
        container.replaceChildren();
        data.posts.forEach(post => {
            const div = document.createElement("div");
            const name = document.createElement("h3");
            name.textContent = post.name;
            const description = document.createElement("p");
            description.textContent = post.description;
            const date = document.createElement("p");
            const timestamp = document.createElement("small");
            timestamp.textContent = new Date(post.created_at).toLocaleString();
            date.appendChild(timestamp);
            div.append(name, description, date);

            if (/^https?:\/\//i.test(post.image_url)) {
                const image = document.createElement("img");
                image.src = post.image_url;
                image.width = 200;
                div.appendChild(image);
            }

            if (String(post.user_id) === currentUser) {
                const button = document.createElement("button");
                button.textContent = "Delete";
                button.addEventListener("click", () => deletePost(post.id));
                div.appendChild(button);
            }
            div.appendChild(document.createElement("hr"));
            container.appendChild(div);
        });
    }
}

if (window.location.pathname.includes("Home.html")) {
    function checkSession() {
        if (!sessionStorage.getItem("token")) {
            logout();
        } else if (sessionHasExpired()) {
            endSession();
        } else {
            return true;
        }
    }

    if (checkSession()) window.addEventListener("DOMContentLoaded", getAllPosts);
    window.addEventListener("pageshow", event => {
        if (event.persisted) checkSession();
    });
}


async function deletePost(id) {
    const confirmDelete = confirm("Are you sure?");
    if (!confirmDelete) return;

    const data = await authenticatedRequest(`https://100.55.59.69/delete-posts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!data) return;

    if (data.success) {
        alert("Deleted");
        getAllPosts();
    } else {
        alert("Delete failed");
    }
}


