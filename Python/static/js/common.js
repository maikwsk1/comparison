document.addEventListener("DOMContentLoaded", function () {
    let storedSource = localStorage.getItem("selectedSource");
    let sourceInput = document.getElementById("source_input");

    if (storedSource && sourceInput) {
        sourceInput.value = storedSource;
    }
});

function startAndReset() {
    alert("⭕➀スタートしました。\n🔔➁プロタグが何が欲しいか教えてくれるのを確認しよう！");

    fetch('/reset_session', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            document.getElementById("character_demand").textContent = data.character_demand;
        })
        .then(() => new Promise(resolve => setTimeout(resolve, 500)))
        .then(() => fetch('/start', { method: 'POST' }))
        .then(response => response.json())
        .then(data => {
            document.getElementById("character_demand").textContent = data.character_demand;
        })
        .catch(error => console.error("❌ エラー: ", error));
}

function resetSession() {
    alert("終了ボタンが押されました。\n🔔画面のリロードもお願いします！");

    fetch('/reset_session', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            document.getElementById("character_demand").textContent = data.character_demand;
        })
        .catch(error => console.error("❌ エラー: ", error));
}

function person_fish() {
    fetch('/contact_staff?source=fish', { method: 'GET' })
        .then(response => response.text())
        .then(data => {
            document.getElementById("selected_expert").textContent = data;
        })
        .catch(error => console.error("❌ Fetch error:", error));
}

function person_vegetables() {
    fetch('/contact_staff?source=vegetables', { method: 'GET' })
        .then(response => response.text())
        .then(data => {
            document.getElementById("selected_expert").textContent = data;
        })
        .catch(error => console.error("❌ Fetch error:", error));
}