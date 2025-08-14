Chart.register(ChartDataLabels);
//🕹️🚨🧩💡

//💡円グラフのラベル・色・タイトル定義
const colors = ['#007BFF', '#FF4136', '#FFDC00', '#333333', '#2ECC40'];
const labels = ['教育（🔵）', '統制（🔴）', '経済（🟡）', '無秩序（⚫）', '農業（🟢）'];

//💡都市ごとの円グラフの定義
const chartTitles = {
    minato: "ミナト州",
    naniwa: "ナニワ自由州",
    kitano: "キタノ大地連邦",
    misaki: "ミサキ港",
    shirasagi: "シラサギ州"
};
let initialCityData = {};
const chartInstances = {};
let dishData = {};

//💡データをフロントエンドのJavScriptで活用するためのもの
fetch("/api/data")
    .then(res => res.json())
    .then(data => {
        cityData = data.cityData;
        dishData = data.dishData;
        initialCityData = data.initialCityData;

        drawCharts('current'); //初期表示は現在スコア
        updateCitySelector();
    });


//dishData 読み込みと都市セレクト切り替え
async function loadDishData() {
    try {
        const res = await fetch("/data/dishData.json");
        dishData = await res.json();
        updateCitySelector();
    } catch (err) {
        console.error("dishData 読み込みエラー:", err);
    }
}
function updateCitySelector() {
    const selectedDish = document.getElementById("dish")?.value;
    const selectedDishObj = dishData.find(d => d.name === selectedDish);
    const type = selectedDishObj?.type;

    const cityBox = document.getElementById("citySelectBox");
    if (cityBox) {
        cityBox.style.display = type === "color" ? "block" : "none";
        console.log("🏙️ 都市選択フォーム:", cityBox.style.display);
    }
}

// 🧠 専門家データの取得
function person_fish() {
    fetch('/contact_staff?source=rule')
        .then(res => res.text())
        .then(data => {
            document.getElementById("selected_expert").textContent = data;
        })
        .catch(error => console.error("❌ Fetch error:", error));
}
function person_vegetables() {
    fetch('/contact_staff?source=vegetables')
        .then(res => res.text())
        .then(data => {
            document.getElementById("selected_expert").textContent = data;
        })
        .catch(error => console.error("❌ Fetch error:", error));
}


// 📊 描画関数：mode = 'initial' or 'current'
async function drawCharts(mode = 'current') {
    const cities = Object.keys(chartTitles);
    let cityData = {};

    if (mode === 'initial') {
        cityData = initialCityData;
    } else {
        const res = await fetch("/data/cityData.json?_t=" + Date.now());
        cityData = await res.json();
    }

    const colorNames = {
        "#3498db": "青",
        "#e74c3c": "赤",
        "#f1c40f": "黄",
        "#34495e": "黒",
        "#2ecc71": "緑"
    };

    const colorKeys = ["blue", "red", "yellow", "black", "green"];
    const colorMap = {
        blue: "#3498db",
        red: "#e74c3c",
        yellow: "#f1c40f",
        black: "#34495e",
        green: "#2ecc71"
    };

    cities.forEach(city => {
        const canvas = document.getElementById(`${city}Chart`);
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const scores = cityData[city] || {
            blue: 0, red: 0, yellow: 0, black: 0, green: 0
        };

        if (chartInstances[city]) {
            chartInstances[city].destroy();
        }

        // 0以外のスコアのみ抽出
        const dataValues = [];
        const backgroundColors = [];
        const labels = [];

        colorKeys.forEach(key => {
            const val = scores[key];
            if (val > 0) {
                dataValues.push(val);
                const color = colorMap[key];
                backgroundColors.push(color);
                labels.push(colorNames[color]);
            }
        });

        const total = dataValues.reduce((sum, val) => sum + val, 0);

        chartInstances[city] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: chartTitles[city],
                        font: { size: 16 }
                    },
                    subtitle: {
                        display: true,
                        text: `合計: ${total}`,
                        font: { size: 14 },
                        padding: { top: 5 }
                    },
                    legend: {
                        display: false
                    },
                    datalabels: {
                        display: true,
                        formatter: (value, context) => {
                            const bgColor = context.dataset.backgroundColor[context.dataIndex];
                            const label = colorNames[bgColor] || "色";
                            return `${label}：${value}`;
                        },
                        color: (context) => {
                            const bgColor = context.dataset.backgroundColor[context.dataIndex];
                            return (bgColor === "#34495e" || bgColor === "#000000") ? "#ffffff" : "#333333";
                        },
                        font: {
                            size: 12
                        },
                        anchor: 'center',
                        align: 'center'
                    }
                }
            }
        });
    });
}
//円グラフを初期値にリセットする処理
function handleReset() {
    return fetch('/reset_session', { method: 'POST' })
        .then(() => fetch('/api/data'))
        .then(res => res.json())
        .then(data => {
            cityData = data.cityData;
            initialCityData = data.initialCityData;
            drawCharts('current');
            alert("初期化が完了しました！");
        });
}

//リセットボタン
function restartAll() {
    if (!confirm("すべてリセットして最初からやり直しますか？")) return;

    handleReset().then(() => {
        currentTurn = 1;
        selectedChoice = null;
        renderNews();
    });
}

fetch('/data/cityData.json')
    .then(res => res.json())
    .then(cityData => {
        const scores = cityData["minato"]; // 都市選択を動的にしてもOK
        const ctx = document.getElementById('effectChart').getContext('2d');

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(scores),
                datasets: [{
                    data: Object.values(scores),
                    backgroundColor: ['red', 'blue', 'yellow', 'black', 'green']
                }]
            },
            options: {
                plugins: { legend: { position: 'bottom' } }
            }
        });
    });


document.addEventListener("DOMContentLoaded", () => {
    const storedSource = localStorage.getItem("selectedSource");
    const sourceInput = document.getElementById("source_input");
    if (storedSource && sourceInput) {
        sourceInput.value = storedSource;
    }

    document.getElementById("dish")?.addEventListener("change", updateCitySelector);
});
