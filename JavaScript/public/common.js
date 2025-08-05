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

//🕹️🚨🧩💡
//💡非同期関数で、都市スコアを取得し、グラフ描画までをまとめて実行する。
//"CityData"の円グラフ
async function loadCityDataAndDrawCharts() {
    try {
        //🕹️サーバーから都市ごとのスコアを取得。
        //🧩"?_t=タイプスタンプ"をつけてキャッシュ(一度読んだファイルを一時的に保存すること)防止して、常に最新のデータを取得
        const res = await fetch("/data/cityData.json?_t=" + Date.now());

        //🕹️取得したJSONデータ(テキスト)をオブジェクト(実際のプログラム内で使えるもの)に変換
        const cityData = await res.json();

        //🕹️描画対象の都市リスト。それぞれに円グラフが表示される。
        const cities = ["minato", "naniwa", "kitano", "misaki", "shirasagi"];

        //🕹️すべての都市に対して、順番にグラグを描画するループ処理
        cities.forEach(city => {
            const id = city + "Chart";//グラフを描画するindex.cjsの<canvas>のID。
            const canvas = document.getElementById(id);//HTML内の<canvas>要素を取得してグラフの描画領域を準備
            if (!canvas) return;//🚨指定した<canvas>要素が見つからなかったら、その都市のグラフをスキップする
            const ctx = canvas.getContext("2d");//"Canvas API"を使ってChart.jsが使えるようにする

            //🚨都市スコアがあれば使い、なければ空のスコアで初期化
            const scores = cityData[city] || {
                blue: 0,
                red: 0,
                yellow: 0,
                black: 0,
                green: 0
            };

            //🚨すでにグラフが存在していた場合、一度廃棄して再描画し、二重描画を防ぐ
            if (chartInstances[city]) {
                chartInstances[city].destroy();
            }

            //🕹️"Chart.js"を使って円グラフを生成
            chartInstances[city] = new Chart(ctx, {
                type: 'doughnut',//🧩ドーナツ型
                data: {
                    labels,
                    datasets: [{
                        data: [
                            scores.blue,
                            scores.red,
                            scores.yellow,
                            scores.black,
                            scores.green
                        ],//🧩各種のスコア配列
                        backgroundColor: colors////🧩色ごとの色設定
                    }]
                },
                //各都市ごとのタイトル表示
                options: {
                    plugins: {
                        title: { display: true, text: chartTitles[city] },
                        legend: { display: false }
                    }
                }
            });

            // 🔍 デバッグ用ログ（city はこのスコープ内なら使える）
            console.log("canvas:", canvas);
        });

    } catch (error) {
        console.error("📊 グラフ読み込みエラー:", error);
    }
}

// 🧠 専門家データの取得
function person_fish() {
    fetch('/contact_staff?source=fish')
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
        // 現在データ取得
        const res = await fetch("/data/cityData.json?_t=" + Date.now());
        cityData = await res.json();
    }

    cities.forEach(city => {
        const canvas = document.getElementById(`${city}Chart`);
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const scores = cityData[city] || { blue: 0, red: 0, yellow: 0, black: 0, green: 0 };

        if (chartInstances[city]) {
            chartInstances[city].destroy();
        }

        chartInstances[city] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: [scores.blue, scores.red, scores.yellow, scores.black, scores.green],
                    backgroundColor: colors
                }]
            },
            options: {
                plugins: {
                    title: { display: true, text: chartTitles[city] },
                    legend: { display: false }
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
    loadCityDataAndDrawCharts();
    document.getElementById("dish")?.addEventListener("change", updateCitySelector);
});
