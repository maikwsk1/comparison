document.addEventListener("DOMContentLoaded", function () {
    let storedSource = localStorage.getItem("selectedSource"); // 店舗選択のキー

    // 🔄 ページロード時にデータ復元（少し遅らせる）
    setTimeout(() => {
        restoreData();
    }, 100);

    let sourceInput = document.getElementById("source_input");
    if (storedSource && sourceInput) {
        sourceInput.value = storedSource; // 店舗選択の値を復元
    }
});


function startAndReset() {
    fetch('/start', { method: 'POST' })
        .then(response => response.text())
        .then(data => {
            document.getElementById("character_demand").innerText = data;
            console.log("✅ ゲーム開始: ", data);
        })
        .then(() => {
            resetSession();  // `session` のデータもリセット
        });
}

function resetSession() {
    fetch('/reset_session', { method: 'POST' })
        .then(() => {
            console.log("🔄 セッションのデータがリセットされました！");
        });
}


// ✅ 店舗選択機能
function person_fish() {
    localStorage.setItem("selectedSource", "fish");
    let sourceInput = document.getElementById("source_input");
    if (sourceInput) {
        sourceInput.value = "fish";
    }

    fetch(`/contact_staff?source=fish`, { method: 'GET' })
        .then(response => response.text())
        .then(data => {
            document.getElementById("view-container").innerHTML = data;
        })
        .then(() => {
            window.location.href = "/contact_staff?source=fish";
        })
        .catch(error => console.error("❌ Fetch error:", error));
}

function person_vegetables() {
    localStorage.setItem("selectedSource", "vegetables");
    let sourceInput = document.getElementById("source_input");
    if (sourceInput) {
        sourceInput.value = "vegetables";
    }

    fetch(`/contact_staff?source=vegetables`, { method: 'GET' })
        .then(response => response.text())
        .then(data => {
            document.getElementById("view-container").innerHTML = data;
        })
        .then(() => {
            window.location.href = "/contact_staff?source=vegetables";
        })
        .catch(error => console.error("Fetch error:", error));
}
// カウント管理
async function updateCount() {
    const response = await fetch("/count");
    const data = await response.json();
    document.getElementById("count").innerText = data.count;
}
async function increment() {
    const response = await fetch("/increment", { method: "POST" });
    const data = await response.json();
    document.getElementById("count").innerText = data.count;
}
async function resetCount() {
    const response = await fetch("/reset", { method: "POST" });
    const data = await response.json();
    document.getElementById("count").innerText = data.count;
}