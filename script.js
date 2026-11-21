const api = "https://100.55.59.69";
const byId = id => document.getElementById(id);

function feedback(element, message = "", kind = "") {
    element.dataset.kind = kind;
    element.textContent = message;
}

function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("expiresAt");
    sessionStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    window.location.replace("index.html");
}

function endSession() {
    sessionStorage.setItem("loginNotice", "expired");
    logout();
}

function sessionHasExpired() {
    const expiresAt = Number(sessionStorage.getItem("expiresAt"));
    return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

async function authenticatedRequest(path, options) {
    const token = sessionStorage.getItem("token");
    if (!token || sessionHasExpired()) {
        endSession();
        return;
    }
    const response = await fetch(api + path, {
        ...options,
        headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) {
        endSession();
        return;
    }
    return response.json();
}

function sendJson(path, body) {
    return fetch(api + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then(response => response.json());
}

function serverMessage(result, fallback) {
    return typeof result.message === "string" && result.message.trim() ? result.message : fallback;
}

function submitForm(id, status, pendingMessage, action) {
    const form = byId(id);
    if (!form) return;
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (submit.disabled) return;
        submit.disabled = true;
        feedback(status, pendingMessage);
        try {
            await action();
        } catch {
            feedback(status, "Something went wrong. Check your connection and try again.", "error");
        } finally {
            submit.disabled = false;
        }
    });
}

document.querySelectorAll(".password-toggle").forEach(button => {
    const input = byId(button.getAttribute("aria-controls"));
    button.addEventListener("click", () => {
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        button.firstChild.textContent = visible ? "Hide" : "Show";
    });
});

const authFeedback = byId("authFeedback");
if (byId("loginForm")) {
    const notice = sessionStorage.getItem("loginNotice");
    sessionStorage.removeItem("loginNotice");
    if (notice === "expired") {
        feedback(authFeedback, "Your session expired. Sign in again to continue.", "error");
    } else if (notice === "verified") {
        feedback(authFeedback, "Email verified. You can now sign in.", "success");
    }
}

submitForm("loginForm", authFeedback, "Signing in…", async () => {
    const email = byId("loginEmail").value.trim();
    const password = byId("loginPassword").value.trim();
    const result = await sendJson("/login", { email, password });
    if (!result.success) {
        feedback(authFeedback, "Couldn’t sign in. Check your email and password and make sure your email is verified.", "error");
        return;
    }
    sessionStorage.setItem("token", result.token);
    sessionStorage.setItem("expiresAt", result.expiresAt);
    sessionStorage.setItem("userId", result.id);
    window.location.href = "Home.html";
});

submitForm("registrationForm", authFeedback, "Sending your code…", async () => {
    const nameInput = byId("name");
    const emailInput = byId("email");
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = byId("password").value.trim();
    if (!name || /\d/.test(name)) {
        feedback(authFeedback, "Enter your name without numbers.", "error");
        nameInput.focus();
        return;
    }
    if (!email.endsWith("@truman.edu")) {
        feedback(authFeedback, "Use an email address ending in @truman.edu.", "error");
        emailInput.focus();
        return;
    }
    const result = await sendJson("/send-code", { email, name, password });
    if (!result.success) {
        feedback(authFeedback, serverMessage(result, "Couldn’t send the verification email. Try again."), "error");
        return;
    }
    localStorage.setItem("verifyingEmail", email);
    window.location.href = "code.html";
});

submitForm("verificationForm", authFeedback, "Verifying your email…", async () => {
    const email = localStorage.getItem("verifyingEmail");
    if (!email) {
        feedback(authFeedback, "Return to registration to request a verification code.", "error");
        return;
    }
    const code = byId("codeInput").value.trim();
    const result = await sendJson("/verify-code", { email, code });
    if (!result.success) {
        feedback(authFeedback, "That code couldn’t be verified. Check the six digits and try again.", "error");
        return;
    }
    localStorage.removeItem("verifyingEmail");
    sessionStorage.setItem("loginNotice", "verified");
    window.location.href = "index.html";
});

function setupBoard() {
    const postForm = byId("postForm");
    const postText = byId("postText");
    const fileInput = byId("fileInput");
    const postFeedback = byId("postFeedback");
    const feedFeedback = byId("feedFeedback");
    const feedState = byId("feedState");
    const retry = byId("retryFeed");
    const container = byId("postContainer");
    const photoDialog = byId("photoDialog");
    const fullPhoto = byId("fullPhoto");
    const deleteDialog = byId("deleteDialog");
    const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    const types = ["image/jpeg", "image/png", "image/webp"];
    let previewUrl;
    let pendingDelete;
    let feedRequest = 0;

    function clearImage() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = undefined;
        fileInput.value = "";
        byId("previewPhoto").removeAttribute("src");
        byId("fileName").textContent = "";
        byId("imagePreview").hidden = true;
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        feedback(postFeedback);
        if (!file) {
            clearImage();
            return;
        }
        if (!types.includes(file.type) || file.size > 5 * 1024 * 1024) {
            clearImage();
            feedback(postFeedback, "Choose a JPEG, PNG, or WebP image up to 5 MiB.", "error");
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        byId("previewPhoto").src = previewUrl;
        byId("fileName").textContent = file.name;
        byId("imagePreview").hidden = false;
        feedback(postFeedback, "Photo attached.", "success");
    });

    byId("removeImage").addEventListener("click", () => {
        clearImage();
        fileInput.focus();
        feedback(postFeedback, "Photo removed.", "success");
    });

    submitForm("postForm", postFeedback, "Publishing your post…", async () => {
        const description = postText.value.trim();
        if (!description) {
            feedback(postFeedback, "Add a description before publishing.", "error");
            postText.focus();
            return;
        }
        const body = new FormData();
        body.append("title", "Post");
        body.append("description", description);
        if (fileInput.files[0]) body.append("image", fileInput.files[0]);
        const controls = [postText, fileInput, byId("removeImage")];
        controls.forEach(control => { control.disabled = true; });
        try {
            const result = await authenticatedRequest("/posts", { method: "POST", body });
            if (!result) return;
            if (!result.success) {
                feedback(postFeedback, serverMessage(result, "Couldn’t publish your post. Try again."), "error");
                return;
            }
            postForm.reset();
            clearImage();
            feedback(postFeedback, "Your post is now on the noticeboard.", "success");
            await loadFeed();
        } finally {
            controls.forEach(control => { control.disabled = false; });
        }
    });

    function renderPost(post) {
        const author = typeof post.name === "string" && post.name.trim() ? post.name.trim() : "TruFind member";
        const article = document.createElement("article");
        article.className = "post-card";

        const header = document.createElement("header");
        header.className = "post-header";
        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = author.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase();
        const byline = document.createElement("div");
        const name = document.createElement("h3");
        name.className = "post-author";
        name.textContent = author;
        byline.append(name);

        const date = new Date(post.created_at);
        if (post.created_at && Number.isFinite(date.getTime())) {
            const time = document.createElement("time");
            time.className = "post-date";
            time.dateTime = date.toISOString();
            time.textContent = dateFormat.format(date);
            byline.append(time);
        }
        header.append(avatar, byline);

        const description = document.createElement("p");
        description.className = "post-description";
        description.textContent = post.description;
        article.append(header, description);

        if (typeof post.image_url === "string" && /^https?:\/\//i.test(post.image_url)) {
            const open = document.createElement("button");
            open.type = "button";
            open.className = "post-photo";
            open.setAttribute("aria-label", `Enlarge photo from ${author}’s post`);
            const image = document.createElement("img");
            image.alt = "";
            image.loading = "lazy";
            image.src = post.image_url;
            image.addEventListener("error", () => {
                const note = document.createElement("p");
                note.className = "help";
                note.textContent = "Photo unavailable.";
                open.replaceWith(note);
            });
            open.append(image);
            open.addEventListener("click", () => {
                fullPhoto.src = image.src;
                fullPhoto.alt = `Photo from ${author}’s post`;
                photoDialog.showModal();
            });
            article.append(open);
        }

        if (String(post.user_id) === sessionStorage.getItem("userId")) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "text-button delete-button";
            button.textContent = "Delete post";
            button.addEventListener("click", () => {
                pendingDelete = { id: post.id, button, article };
                deleteDialog.returnValue = "cancel";
                deleteDialog.showModal();
            });
            article.append(button);
        }
        return article;
    }

    async function loadFeed() {
        const request = ++feedRequest;
        container.setAttribute("aria-busy", "true");
        retry.hidden = true;
        feedState.hidden = false;
        feedState.textContent = "Loading posts…";
        try {
            const response = await fetch(api + "/all-posts");
            const result = await response.json();
            if (!result.success || !Array.isArray(result.posts)) throw new Error("Feed unavailable");
            if (request !== feedRequest) return;
            container.replaceChildren(...result.posts.map(renderPost));
            feedState.hidden = result.posts.length > 0;
            feedState.textContent = "No posts yet. Share a note to get the board started.";
        } catch {
            if (request !== feedRequest) return;
            feedState.textContent = "Couldn’t load the noticeboard. Try again in a moment.";
            retry.hidden = false;
        } finally {
            if (request === feedRequest) container.setAttribute("aria-busy", "false");
        }
    }

    photoDialog.addEventListener("close", () => fullPhoto.removeAttribute("src"));
    deleteDialog.addEventListener("close", async () => {
        const target = pendingDelete;
        pendingDelete = undefined;
        if (!target || deleteDialog.returnValue !== "delete") return;
        target.button.disabled = true;
        feedback(feedFeedback, "Deleting post…");
        try {
            const result = await authenticatedRequest(`/delete-posts/${encodeURIComponent(target.id)}`, { method: "DELETE" });
            if (!result) return;
            if (!result.success) throw new Error("Delete failed");
            target.article.remove();
            feedback(feedFeedback, "Post deleted.", "success");
            const feedTitle = byId("feed-title");
            if (document.activeElement === document.body) {
                feedTitle.tabIndex = -1;
                feedTitle.focus();
            }
            await loadFeed();
        } catch {
            feedback(feedFeedback, "Couldn’t delete the post. Try again.", "error");
        } finally {
            target.button.disabled = false;
        }
    });

    retry.addEventListener("click", loadFeed);
    byId("logoutButton").addEventListener("click", logout);
    loadFeed();
}

if (byId("postForm")) {
    function checkSession() {
        if (!sessionStorage.getItem("token")) logout();
        else if (sessionHasExpired()) endSession();
        else return true;
        return false;
    }
    if (checkSession()) setupBoard();
    window.addEventListener("pageshow", event => {
        if (event.persisted) checkSession();
    });
}
