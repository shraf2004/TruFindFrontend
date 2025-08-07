// ✅✅✅ TruFind script.js — Frontend

if (window.location.pathname.includes("Home.html")) {
    const currentUser = localStorage.getItem("userName");
    if (!currentUser) window.location.href = "index.html";
}

async function validForm() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (name === "" || /\d/.test(name)) return alert("Invalid name");
    if (!email.endsWith("@truman.edu")) return alert("Email must end with @truman.edu");

    const response = await fetch("https://trufindbackend.onrender.com/send-code", {
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

    const response = await fetch("https://trufindbackend.onrender.com/verify-code", {
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

    const response = await fetch("https://trufindbackend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
    });

    const data = await response.json();
    if (data.success) {
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userId", data.id);
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
        formData.append("user_id", localStorage.getItem("userId"));
        formData.append("title", "Post");
        formData.append("description", postText.value);

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const allowed = ["image/jpeg", "image/png", "image/webp"];
            if (!allowed.includes(file.type)) return alert("Invalid file type");
            formData.append("image", file);
        }

        const res = await fetch("https://trufindbackend.onrender.com/posts", {
            method: "POST",
            body: formData
        });

        const result = await res.json();
        if (result.success) {
            alert("Post saved");
            window.location.reload();
        } else {
            alert("Post failed");
        }
    });
}

async function getAllPosts() {
    const response = await fetch("https://trufindbackend.onrender.com/all-posts");
    const data = await response.json();
    const container = document.getElementById("postContainer");
    const currentUser = localStorage.getItem("userId");

    if (data.success) {
        container.innerHTML = "";
        data.posts.forEach(post => {
            const div = document.createElement("div");
            let html = `<h3>${post.name}</h3><p>${post.description}</p><p><small>${new Date(post.created_at).toLocaleString()}</small></p>`;
            if (post.image_url && post.image_url !== "No image") html += `<img src="${post.image_url}" width="200">`;
            if (post.user_id.toString() === currentUser) html += `<button onclick="deletePost(${post.id})">Delete</button>`;
            html += `<hr>`;
            div.innerHTML = html;
            container.appendChild(div);
        });
    }
}

if (window.location.pathname.includes("Home.html")) {
    window.addEventListener("DOMContentLoaded", getAllPosts);
}


async function deletePost(id) {
    const confirmDelete = confirm("Are you sure?");
    if (!confirmDelete) return;

    const userId = localStorage.getItem("userId");
    const res = await fetch(`https://trufindbackend.onrender.com/delete-posts/${id}?userId=${userId}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
        alert("Deleted");
        getAllPosts();
    } else {
        alert("Delete failed");
    }
}
