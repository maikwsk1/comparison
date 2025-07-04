// 外部ライブラリ（npm系）
const express = require("express");
const session = require("express-session");
const axios = require("axios");

// Node.js標準モジュール
const path = require("path");
const fs = require("fs");

// アプリインスタンス作成
const app = express();

// 基本ミドルウェア設定
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true
}));

// テンプレートエンジン設定（EJS）
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 自作ファイルやデータ（JSON読み込み）
const dishData = require("./public/data/dishData.json");//食べ物のデータ
const cityData = require("./public/data/cityData.json");//都市のデータ(円グラフに描画）
const newsPhases = require("./public/data/newsPhases.json");//ニュース

//📝都市の初期値のスコア
const initialCityData = {
    minato: { blue: 40, red: 30, yellow: 20, black: 10, green: 0 },
    naniwa: { yellow: 50, green: 20, blue: 20, black: 10, red: 0 },
    shirasagi: { black: 40, red: 30, green: 20, blue: 10, yellow: 0 },
    kitano: { green: 50, blue: 20, black: 20, yellow: 10, red: 0 },
    misaki: { yellow: 40, blue: 30, black: 20, green: 10, red: 0 }
};

//セッションに都市データがなければ初期値で初期化
app.use((req, res, next) => {
    if (!req.session.city_data) {
        req.session.city_data = JSON.parse(JSON.stringify(initialCityData));
    }
    next();
});

//📝リセット処理(円グラフの都市データ限定）
app.post("/reset_session", (req, res) => {

    //スプレッド演算子でコピーして代入
    req.session.city_data = { ...initialCityData };

    //サーバー側からJSONファイルに新しいデータを書き込む処理
    fs.writeFileSync(
        path.join(__dirname, "public", "data", "cityData.json"),
        JSON.stringify(req.session.city_data, null, 2)
    );

    res.json({ status: "ok" });//処理成功をクライアントに伝えるためのレスポンス
});

//📝フロント側が必要とするJSONデータをまとめて返すAPIエンドポイント
app.get("/api/data", (req, res) => {
    res.json({
        //データが無ければ{}（空）で返すことにより、エラーを回避
        cityData: req.session.city_data || {},
        dishData: dishData || {},
        initialCityData: initialCityData
    });
});

//ルート
app.get("/", async (req, res) => {

    req.session.city_data = cityData;

    const turn = req.session.currentTurn || 1;
    const news = newsPhases.find(n => n.turn === turn);
    const penalty = newsPhases.find(n => n.penalty?.appearsOnTurn === turn);

    res.render("index", {
        session: req.session, dishData, city_data: req.session.city_data, selectedDish: req.session.completed_food || null, turn, news, penalty, completed_food: req.session.completed_food || ""

    });
});

// 専門家の選択 (`GET /contact_staff`)
app.get("/contact_staff", (req, res) => {
    const selectedSource = req.query.source || req.session.selectedSource;
    req.session.selectedSource = selectedSource;

    let message = "❌ 順番が間違っています。先に専門家にレシピを聞いてください。";
    let message2 = "";

    if (selectedSource === "fish") {
        message = "🐟 魚の専門家です。何が欲しいのか、入力欄で教えてください！";
    } else if (selectedSource === "vegetables") {
        message = "🥦 野菜の専門家です。何が欲しいのか、入力欄で教えてください！";
    }

    res.render("contact_staff", { message, message2, session: req.session });
});

// 食べ物のリクエスト (`POST /contact_staff`)
app.post("/contact_staff", (req, res) => {
    const foodId = req.body.food_id;
    req.session.food_id = foodId;

    let message = "";
    let message2 = "";

    if (!req.session.selectedSource) {
        message = "❌ 先に専門家にレシピを聞いてください。";
    } else if (!foodId) {
        message = "❌ 食べ物が選択されていません！";
    } else if (req.session.selectedSource === "fish") {
        if (foodId === "かまぼこ") {
            message = "かまぼこが欲しいのなら、ヒラメと金槌を持ってきてね。";
            message2 = "⭕ 正しい専門家を選択し、レシピを聞くことができました！";
        } else {
            message = `申し訳ないですが、${foodId} は他の専門家に聞いてください。`;
        }
    } else if (req.session.selectedSource === "vegetables") {
        if (foodId === "焼きとうもろこし") {
            message = "焼きとうもろこしが欲しいなら、とうもろこしとオーブンレンジを持ってきてね。";
            message2 = "⭕ 正しい専門家を選択し、レシピを聞くことができました！";
        } else {
            message = `申し訳ないですが、${foodId} は他の専門家に聞いてください。`;
        }
    }

    res.render("contact_staff", { message, message2, session: req.session });
});

app.post("/finding_things", (req, res) => {
    
    //フロント（フォームやボタン）から送信されたアイテム名
    const selectedItem = req.body.selectedItem;

    const selectedArray = Array.isArray(selectedItem)
        ? selectedItem.map(convertToZenkaku)
        : [convertToZenkaku(selectedItem)];

    switch (req.session.source) {
        case "house":
            req.session.tool_house = selectedArray;
            req.session.message = "🏠 無事に入手できました。持ち物が追加されました！";
            break;
        case "tree":
            req.session.food_tree = selectedArray;
            req.session.message = "🌳 無事に収穫できました。持ち物が追加されました！";
            break;
        case "submarine":
            req.session.food_fish = selectedArray;
            req.session.message = "🌊 無事に漁獲できました。持ち物が追加されました！";
            break;
        case "earth":
            req.session.food_earth = Array.from(new Set([
                ...(Array.isArray(req.session.food_earth) ? req.session.food_earth : []),
                ...selectedArray
            ]));
            req.session.message = "🌍 地球から素材をゲット！持ち物に追加されました。";
            break;
        default:
            req.session.message = "❌ 不明な探索元です。";
    }

    req.session.selectedItem = selectedItem;
    res.redirect("/finding_things");
});



//森や海などで材料を選ぶ選択フォームの内容
app.get("/finding_things", (req, res) => {
    const source = req.query.source || req.session.source;
    req.session.source = source;

    let items = [];
    let title = "❌ 何も見つかりませんでした！";
    let message = req.session.message || "";
    req.session.message = "";

    if (source === "house") {
        items = [
            "煮込み鍋",
            "鉄板",
            "フライ器",
            "たこ焼き器",
            "お弁当詰め工程",
            "包み布",
            "焼き型",
            "ワンプレート皿",
            "炒め釜",
            "乾燥炉",
            "煮込み釜",
            "蒸籠",
            "冷却皿",
            "炙り皿"
        ];
        title = "🏠 家の中にある道具と加工品";
    } else if (source === "tree") {
        items = [
            "根菜セット（にんじん・じゃがいも）",
            "乾物野菜セット（海苔・しらす）",
            "野菜セット（大根・ねぎ）",
            "キャベツ山",
            "色野菜盛り（にんじん・ピーマン）",
            "保存野菜",
            "山菜",
            "オイル",
            "お肉",
            "牛乳",
            "野菜あん",
            "炒めバターコーン"
        ];
        title = "🌳 森の中の食材";
    } else if (source === "submarine") {
        items = [
            "海鮮ミックス（イカ・桜えび）",
            "タコ切片",
            "魚切身（鮭）",
            "魚切身（鯖）",
            "出汁（煮干し・昆布）"
        ];
        title = "🌊 海の中の食材";
    } else if (source === "earth") {
        items = [
            "香辛料パック（カレー粉・スパイス）",
            "白米",
            "味噌",
            "乾麺",
            "麦粉・小麦粉セット（ラーメン・お好み焼き・パン）",
            "衣粉セット（パン粉・卵）",
            "寒地小麦麺と焙煎味噌",
            "洋風粉末とカツ素材（魚or豚）",
            "麺",
            "うどん",
            "ソーセージ",
            "小麦粉",
            "塩",
            "パン",
            "砂糖",
            "オイル",
            "あんこ",
            "もち米"
        ];
        title = "🌍 地球から得られる素材";
    }

    res.render("finding_things", { title, items, source, message, session: req.session });
});

//円グラフの処理
function rebalanceCityScores(currentData, tags, delta) {
    const cityScores = { ...currentData };

    tags.forEach(tag => {
        cityScores[tag] = (cityScores[tag] || 0) + delta;
    });

    const total = Object.values(cityScores).reduce((sum, val) => sum + val, 0);
    const excess = total - 100;

    if (excess > 0) {
        const reduceTags = Object.keys(cityScores).filter(tag => !tags.includes(tag));
        const perTag = reduceTags.length > 0 ? excess / reduceTags.length : 0;

        reduceTags.forEach(tag => {
            cityScores[tag] = Math.max(0, cityScores[tag] - perTag);
        });
    }

    Object.keys(cityScores).forEach(tag => {
        cityScores[tag] = Math.round(cityScores[tag]);
    });

    return cityScores;
}

app.post("/apply_dish", (req, res) => {
    let selectedDish = req.body.selected_dish;
    if (Array.isArray(selectedDish)) selectedDish = selectedDish[0]; // ✅ 安定化

    const selectedCity = req.body.selected_city;
    const dishInfo = dishData.find(d => d.name === selectedDish);

    if (!dishInfo) {
        req.session.message = "❌ 対応する料理が見つかりません。";
        return res.redirect("/chef");
    }

    let targetCity = selectedCity;
    if (dishInfo.type === "city") {
        targetCity = dishInfo.city;
    }

    if (dishInfo.type === "color" && !selectedCity) {
        req.session.message = "❌ 反映には都市を選んでください。";
        return res.redirect("/chef");
    }

    req.session.city_data ??= JSON.parse(JSON.stringify(initialCityData));
    req.session.city_data[targetCity] ??= { red: 0, blue: 0, yellow: 0, black: 0, green: 0 };

    req.session.applied_dishes ??= [];
    if (req.session.applied_dishes.includes(selectedDish)) {
        req.session.message = `⚠️「${selectedDish}」はすでに反映済みです！`;
        return res.redirect("/chef");
    }

    req.session.applied_dishes.push(selectedDish);
    req.session.city_data[targetCity] = rebalanceCityScores(
        req.session.city_data[targetCity],
        dishInfo.tags,
        5
    );

    const tagLabels = {
        red: "🟥 赤", blue: "🔵 青", yellow: "🟡 黄", black: "⚫ 黒", green: "🟢 緑"
    };
    const msg = dishInfo.tags.map(t => `${tagLabels[t] || t} +5%`).join(", ");
    req.session.message = `「${selectedDish}」を ${targetCity} に反映！ ${msg} 増やしました🌈`;

    fs.writeFileSync(
        path.join(__dirname, "public", "data", "cityData.json"),
        JSON.stringify(req.session.city_data, null, 2)
    );

    res.redirect("/");
});

// 最上部または app.get("/chef") より前に置く！

function matchesFoodEarth(recipeValue, playerValue) {
    if (!recipeValue || !playerValue) return false;

    const toArray = val =>
        Array.isArray(val)
            ? val
            : typeof val === "string" && val.includes("+")
                ? val.split("+")
                : [val];

    const recipeItems = toArray(recipeValue);
    const playerItems = toArray(playerValue);

    return recipeItems.every(item => playerItems.includes(item));
}
function convertToZenkaku(str) {
    return typeof str === "string"
        ? str
            .replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0))
            .replace(/ /g, "　")
        : str;
}

function matchesSimple(recipeValue, playerValue) {
    if (!recipeValue || !playerValue) return false;

    const toArray = val =>
        Array.isArray(val)
            ? val
            : typeof val === "string" && val.includes("+")
                ? val.split("+")
                : [val];

    const recipeItems = toArray(recipeValue).map(convertToZenkaku);
    const playerItems = toArray(playerValue).map(convertToZenkaku);

    return recipeItems.every(r => playerItems.includes(r));
}

// 🍳 /chef → 組み合わせ判定と調理完了表示
app.get("/chef", (req, res) => {
    let completed_food = req.session.completed_food;
    const dishInfo = dishData.find(d => d.name === completed_food);
    const selectedCity = req.body?.selected_city || req.session.selected_city || null;

    console.log("✅ completed_food:", completed_food);
    console.log("✅ dishInfo:", dishInfo);
    console.log("✅ selectedCity:", selectedCity);
    function matchesFoodEarth(recipeValue, playerValue) {
        if (!recipeValue || !playerValue) return false;

        const toArray = val =>
            Array.isArray(val)
                ? val
                : typeof val === "string" && val.includes("+")
                    ? val.split("+")
                    : [val];

        const recipeItems = toArray(recipeValue).map(convertToZenkaku);
        const playerItems = toArray(playerValue).map(convertToZenkaku);

        return recipeItems.every(r => playerItems.includes(r));
    }
    const {
        food_tree = "未指定",
        food_fish = "未指定",
        food_earth = "未指定",
        tool_house = "未指定"
    } = req.session;

    const fish = Array.isArray(food_fish) ? food_fish[0] : food_fish;
    const tool = Array.isArray(tool_house) ? tool_house[0] : tool_house;


    let chef_message = "材料が揃っていないか、レシピに合っていないようです。";
    let chef_cooking = req.session.chef_cooking || "";
    let chef_cooking2 = req.session.chef_cooking2 || "";

    const match = dishData.find(recipe => {
        const c = recipe.conditions || {};

        console.log("\n🍽️ 試行中レシピ:", recipe.name);
        console.log("  🔸 food_earth 条件:", c.food_earth);
        console.log("  🔸 food_fish 条件:", c.food_fish);
        console.log("  🔸 tool_house 条件:", c.tool_house);
        console.log("  🔹 セッション food_earth:", food_earth);
        console.log("  🔹 セッション food_fish:", food_fish);
        console.log("  🔹 セッション tool_house:", tool_house);
        const matchResult =
            (!c.food_tree || matchesSimple(c.food_tree, food_tree)) &&
            (!c.food_fish || matchesSimple(c.food_fish, food_fish)) &&
            (!c.food_earth || matchesFoodEarth(c.food_earth, food_earth)) &&
            (!c.tool_house || matchesSimple(c.tool_house, tool_house));
        console.log(`  ✅ マッチ判定結果: ${matchResult ? "✅ 成功" : "❌ 不一致"}`);
        console.log("✅ 判定用素材（fish/tool）:", fish, tool);
        return matchResult;
    });
    if (match) {
        completed_food = match.name;
        chef_message = match.message;
        req.session.completed_food = completed_food;
        req.session.chef_cooking = "";
        req.session.chef_cooking2 = "";
    }

    res.render("chef", {
        completed_food,
        chef_message,
        food_tree,
        food_fish,
        food_earth,
        tool_house,
        chef_cooking,
        chef_cooking2
    });
});
app.post("/cooking", (req, res) => {
    console.log("✅ session at /cooking:", JSON.stringify(req.session, null, 2));
    let completed_food = req.session.completed_food || null;

    //completed_food:作ろうとしている料理、かんせいした料理

    const selectedCity = req.body.selected_city || req.session.selected_city;
    req.session.selected_city = selectedCity;

    if (!completed_food || completed_food === "なし") {
        req.session.message = "❌ まだ調理可能な料理がありません！";
        return res.redirect("/chef");
    }

    const dishInfo = dishData.find(d => d.name === completed_food);
    if (!dishInfo) {
        req.session.message = "❌ 不明な料理が選択されました。";
        return res.redirect("/chef");
    }

    req.session.completed_dishes ??= [];
    if (!req.session.completed_dishes.includes(completed_food)) {
        req.session.completed_dishes.push(completed_food);
    }

    const selected_city = dishInfo.type === "city" ? dishInfo.city : req.session.selected_city;


    req.session.city_data ??= JSON.parse(JSON.stringify(initialCityData));
    req.session.city_data[selected_city] ??= JSON.parse(JSON.stringify(initialCityData[selected_city] || {}));

    if (!req.session.city_data[selected_city]) {
        req.session.message = `❌ "${selected_city}" の初期データが見つかりません。`;
        return res.redirect("/chef");
    }

    req.session.city_data[selected_city] = rebalanceCityScores(
        req.session.city_data[selected_city],
        dishInfo.tags,
        5
    );

    fs.writeFileSync(
        path.join(__dirname, "public", "data", "cityData.json"),
        JSON.stringify(req.session.city_data, null, 2)
    );

    // セッション素材消去
    ["tool_house", "food_tree", "food_fish", "food_earth"].forEach(key => req.session[key] = null);

    req.session.message = `「${completed_food}」が完成しました！素材を消費しました🍽️`;
    req.session.chef_cooking = `${completed_food} を調理しました。`;
    req.session.chef_cooking2 = dishInfo.message;

    res.redirect("/chef");
    return;
});

function applyEffectToSession(cityData, effect, city = "naniwa") {
    for (const tag in effect) {
        if (!cityData[city]) {
            cityData[city] = { red: 0, blue: 0, yellow: 0, black: 0, green: 0 };
        }
        cityData[city][tag] = (cityData[city][tag] || 0) + effect[tag];
    }
}

app.post("/apply_news_choice", (req, res) => {
    const { turn, choice } = req.body;
    const news = newsPhases.find(n => n.turn == turn);
    const selected = news?.choices.find(c => c.id === choice);

    if (selected) {
        applyEffectToSession(req.session.city_data, selected.effect);
    }

    req.session.currentTurn = Number(turn) + 1;
    res.redirect("/");
});

//天気に関するデータ
const areaCodes = {
    "北海道": "016000",
    "東京都": "130000",
    "大阪府": "270000",
    "広島県": "340000",
    "長崎県": "420000"
};
const prefectureToWeatherArea = {
    "北海道": "石狩地方",
    "東京都": "東京地方",
    "大阪府": "大阪府",
    "広島県": "南部",
    "長崎県": "南部",
};
const prefectureToTempPoint = {
    "北海道": "札幌",
    "東京都": "東京",
    "大阪府": "大阪",
    "広島県": "広島",
    "長崎県": "長崎",
};

//天気に関する処理
app.post("/weather", async (req, res) => {
    const nicknameToPrefecture = {
        "ミナト州": "東京都",
        "ナニワ自由州": "大阪府",
        "キタノ大地連邦": "北海道",
        "シラサギ州": "広島県",
        "ミサキ港": "長崎県"
    };

    // 入力文字を正式な都道府県名へ変換
    const userInput = req.body.prefecture.trim();
    const prefecture = nicknameToPrefecture[userInput] || userInput;

    // マッピング取得
    const areaCode = areaCodes[prefecture];
    const targetWeatherArea = prefectureToWeatherArea[prefecture];
    const targetTempPoint = prefectureToTempPoint[prefecture];
    if (!areaCode || !targetWeatherArea || !targetTempPoint) {
        return res.render("weather", {
            prefecture,
            weatherData: null,
            error: "指定された都道府県の情報が見つかりませんでした。"
        });
    }

    try {
        const response = await axios.get(`https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`);
        const forecast = response.data;

        // 🌤️ 天気情報の抽出
        const weatherArea = forecast[0]?.timeSeries?.flatMap(ts => ts.areas || [])
            .find(area => area.area.name.includes(targetWeatherArea) && area.weathers);
        const weatherInfo = weatherArea?.weathers?.[0] || "データなし";

        // 🌡️ 気温情報の抽出
        let tempValues = [];

        for (const entry of forecast) {
            for (const ts of entry.timeSeries) {
                for (const area of ts.areas || []) {
                    if (area.area.name === targetTempPoint) {
                        if (area.temps) {
                            tempValues = area.temps.map(t => parseFloat(t)).filter(t => !isNaN(t));
                        } else if (area.tempsMin && area.tempsMax) {
                            tempValues = [
                                parseFloat(area.tempsMin[0]),
                                parseFloat(area.tempsMax[0])
                            ].filter(t => !isNaN(t));
                        }
                        break;
                    }
                }
                if (tempValues.length > 0) break;
            }
            if (tempValues.length > 0) break;
        }

        const tempInfo = tempValues.length > 0
            ? (tempValues.reduce((sum, t) => sum + t, 0) / tempValues.length).toFixed(1)
            : "不明";

        res.render("weather", {
            prefecture,
            weatherData: { weather: weatherInfo, temp: tempInfo },
            error: null
        });

    } catch (error) {
        console.error("天気情報の取得に失敗しました:", error);
        res.render("weather", {
            prefecture,
            weatherData: null,
            error: "天気情報の取得に失敗しました。"
        });
    }
});


// ✅ サーバー起動 (`app.listen()` は最後)
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});