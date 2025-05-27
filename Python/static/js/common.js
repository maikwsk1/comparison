document.addEventListener("DOMContentLoaded", function () {
    let storedSource = localStorage.getItem("selectedSource"); // 店舗選択のキー
    let sourceInput = document.getElementById("source_input");
    if (storedSource && sourceInput) {
        sourceInput.value = storedSource; // 店舗選択の値を復元
    }
});

function startAndReset() {
    fetch('/reset_session', { method: 'POST' }) // ✅ 先にリセット
        .then(response => response.json())
        .then(data => {
            console.log("🔄 セッションがリセットされました！", data.character_demand);
            document.getElementById("character_demand").textContent = data.character_demand; // ✅ 初期値を適用
        })
        .then(() => new Promise(resolve => setTimeout(resolve, 500))) // ✅ 遅延を少し長くする
        .then(() => fetch('/start', { method: 'POST' })) // ✅ `start()` を実行
        .then(response => response.json())
        .then(data => {
            document.getElementById("character_demand").textContent = data.character_demand; // ✅ 新しい食べ物を適用
            console.log("🔄 ゲーム開始！", data.character_demand);
        })
        .catch(error => console.error("❌ エラー: ", error));
}
function resetSession() {
    fetch('/reset_session', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            document.getElementById("character_demand").textContent = data.character_demand; // ✅ 初期値をUIに反映
            console.log("🔄 セッションがリセットされました！", data.character_demand);
        })
        .catch(error => console.error("❌ エラー: ", error));
}

function person_fish() {
    fetch('/contact_staff?source=fish', { method: 'GET' }) // ✅ `GET` のみを送信
        .then(response => response.text())
        .then(data => {
            console.log("✅ 魚屋選択 (GET): ", data);
        })
        .catch(error => console.error("❌ Fetch error:", error));
}
function person_vegetables() {
    fetch('/contact_staff?source=vegetables', { method: 'GET' }) // ✅ `GET` のみを送信
        .then(response => response.text())
        .then(data => {
            console.log("✅ 八百屋選択 (GET): ", data);
        })
        .catch(error => console.error("❌ Fetch error:", error));
}
