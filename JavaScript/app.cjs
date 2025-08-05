//🕹️🚨🧩💡

//💡STEP1:ライブラリの読み込み(外部と標準モジュール)
//外部ライブラリ（npm系）
const express = require("express");
const session = require("express-session");
const axios = require("axios");
// Node.js標準モジュール
const path = require("path");
const fs = require("fs");

//💡STEP2:アプリ設定(ミドルウェアとテンプレート)
//アプリインスタンス作成
const app = express();
//基本ミドルウェア設定
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true
}));
//テンプレートエンジン設定（EJS）
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//💡STEP3:初期データの定義
//自作ファイルやデータ（JSON読み込み）
const dishData = require("./public/data/dishData.json");//食べ物のデータ
const cityData = require("./public/data/cityData.json");//都市のデータ(円グラフに描画）
const newsPhases = require("./public/data/newsPhases.json");//ニュース
//都市の思考スコアの初期値
const initialCityData = {
    minato: { blue: 40, red: 30, yellow: 20, black: 10, green: 0 },
    naniwa: { yellow: 50, green: 20, blue: 20, black: 10, red: 0 },
    shirasagi: { black: 40, red: 30, green: 20, blue: 10, yellow: 0 },
    kitano: { green: 50, blue: 20, black: 20, yellow: 10, red: 0 },
    misaki: { yellow: 40, blue: 30, black: 20, green: 10, red: 0 }
};
//"gameState"（進行状況）の初期値をひとまとめにして管理している
const gameState = {
    currentTurn: 1,//現在のターン
    cityData: {
        minato: { red: 0, blue: 0, yellow: 0, black: 0, green: 0 },
        naniwa: { red: 0, blue: 0, yellow: 0, black: 0, green: 0 },
        kitano: { red: 0, blue: 0, yellow: 0, black: 0, green: 0 },
        misaki: { red: 0, blue: 0, yellow: 0, black: 0, green: 0 },
        shirasagi: { red: 0, blue: 0, yellow: 0, black: 0, green: 0 }
    },//都市ごとのデータ
    satisfaction: 100,//市民の満足度
    chaosLevel: 0,//混乱レベル
    historyLog: []//行動履歴（政策選択など）
};

//💡STEP4:セッションを初期化するミドルウェア
//セッションに都市データがなければ初期値で初期化
app.use((req, res, next) => {
    if (!req.session.city_data) {
        req.session.city_data = JSON.parse(JSON.stringify(initialCityData));
    }
    next();
});

//💡STEP5:データ送信用エンドポイント(Chart.jsなどが使う)
//クライアント(Chart.js)に都市ごとの思想データの初期値（"req.session.gameState.cityData")をJSONとして送信する処理
//"app.use"で取り込んで"app.get"で使うため順番を守らないといけない
app.get("/data/cityData.json", (req, res) => {
    res.json(req.session.city_data);
});
//フロント側が必要とするJSONデータをまとめて返すAPIエンドポイント
app.get("/api/data", (req, res) => {
    res.json({
        //データが無ければ{}（空）で返すことにより、エラーを回避
        cityData: req.session.city_data || {},
        dishData: dishData || {},
        initialCityData: initialCityData
    });
});

//💡STEP6:リセット系POSTルート
//リセット処理(円グラフの都市データ限定）
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
//リセット処理(シェフの初期画面のための処理)
app.post("/reset_chef_state", (req, res) => {
    // ✅ セッション状態を初期化
    req.session.chef_cooking = "";
    req.session.chef_cooking2 = "";
    req.session.completed_food = "";
    req.session.selected_city = null;
    req.session.food_tree = "未指定";
    req.session.food_fish = "未指定";
    req.session.food_earth = "未指定";
    req.session.tool_house = "未指定";
    res.redirect("/"); // 初期料理長画面に戻る
});


//💡STEP7:各画面用GETルート
//ルート
app.get("/", async (req, res) => {
    // まだゲームが開始されていないなら、初期データをセッションにコピー
    if (!req.session.gameState) {
        req.session.gameState = JSON.parse(JSON.stringify(gameState));
    }

    // 現在のターン番号とニュース取得
    const turn = req.session.gameState.currentTurn;
    const news = newsPhases.find(n => n.turn === turn);
    const newsWithPenalty = newsPhases.find(n => n.penalty?.appearsOnTurn === turn);
    const penalty = newsWithPenalty?.penalty ?? null;

    // ペナルティ条件チェック
    if (penalty && req.session.ignoredTurns?.includes(turn - 1)) {
        console.log("✅ ペナルティ発動条件：一致！");
    }

    // 選択された料理に関連するデータを取得
    const selectedDish = req.session.completed_food || null;
    const selectedDishData = selectedDish
        ? dishData.find(d => d.name === selectedDish)
        : null;

    const message = req.session.message;
    req.session.message = null;

    // ✅ affectedCitiesRaw を追加
    const affectedCitiesRaw =
        penalty?.region === "全国"
            ? Object.keys(req.session.gameState.cityData)
            : (penalty?.region || "").split("・");

    // テンプレートレンダリング
    res.render("index", {
        turn,
        news,
        penalty,
        affectedCitiesRaw, // ← ここがポイント！
        city_data: req.session.gameState.cityData,
        completed_food: req.session.completed_food || "",
        selectedDish,
        historyLog: req.session.gameState.historyLog || [],
        dishData,
        selectedDishData,
        session: req.session,
        message
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
    //URLにある"?source=xxx"の値を取得。なければセッションの前回の値を使う。
    const source = req.query.source || req.session.source;
    req.session.source = source;//選んだ場所をセッションに保存。

    let items = [];//素材一覧の初期化
    let title = "❌ 何も見つかりませんでした！";//見つからなかった時のデフォルトタイトル
    let message = req.session.message || "";//表示用メッセージをセッションから取得。
    req.session.message = "";//メッセージを1回きりにするためリセットする。

    //"source"によって出てくる素材
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
            "トマト",
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

//セッションへの料理登録とリダイレクト
app.post("/select_dish", (req, res) => {
    req.session.completed_food = req.body.selected_dish;
    res.redirect("/");
});

//スコア調整関数（色の割合を再バランス)
//都市の思想スコアの色の割合を調整するための処理で、合計が100を超えないように他の色を自動で分配・削減する仕組み。
//🧩/apply_dishからの引数を使用してる。
function rebalanceCityScores(currentData, tags, delta) {

    //🕹️操作対象の都市スコアをコピー（元データを壊さないように）
    //🧩"currentData"は、変数:req.session.city_data[targetCity],//選ばれた都市のスコア(色ごとの数値)
    const cityScores = { ...currentData };

    //🕹️"tag"に含まれる指定量を加算する。例)tag=["red"],dalta=10⇒redの値を10増やすのように。
    tags.forEach(tag => {
        cityScores[tag] = (cityScores[tag] || 0) + delta;
    });

    //🕹️合計地が100を超えていたら、他の色から均等に引く
    const total = Object.values(cityScores).reduce((sum, val) => sum + val, 0);
    const excess = total - 100;

    if (excess > 0) {
        //🕹️増やした色以外に対して、余剰分を均等に減らす
        const reduceTags = Object.keys(cityScores).filter(tag => !tags.includes(tag));
        const perTag = reduceTags.length > 0 ? excess / reduceTags.length : 0;

        //🕹️負の値にならないように"Math.max(0,...)で防ぐ
        reduceTags.forEach(tag => {
            cityScores[tag] = Math.max(0, cityScores[tag] - perTag);
        });
    }

    //🕹️最終的な各スコアを四捨五入して返す
    Object.keys(cityScores).forEach(tag => {
        cityScores[tag] = Math.round(cityScores[tag]);
    });

    console.log("🔧 rebalance 出力:", cityScores);

    return cityScores;//🕹️調整された都市のスコアを返す
}

//料理を都市に反映し、思想スコアに色を加え、グラフやUIに見えるように記録と更新をする。
app.post("/apply_dish", (req, res) => {
    let selectedDish = req.body.selected_dish;//🕹️"selected_dish"（ユーザーが選んだ料理名）を取得

    //🚨フォームから複数値が送られる可能性があるため、配列の場合は最初の要素だけを使用できるようにする。
    if (Array.isArray(selectedDish)) selectedDish = selectedDish[0];

    //🕹️選ばれた都市の料理のデータ情報"dishData"を照合し、効果を取得
    const selectedCity = req.body.selected_city;
    const dishInfo = dishData.find(d => d.name === selectedDish);

    //🕹️同じ料理を複数反映させないよう、履歴を記録して防止。
    req.session.applied_dishes ??= [];
    if (req.session.applied_dishes.includes(selectedDish)) {
        req.session.message = `⚠️「${selectedDish}」はすでに反映済みです！`;
        return res.redirect("/");
    }

    //🚨該当する料理がなかった場合："/chef"に戻ってエラーメッセージを表示。
    if (!dishInfo) {
        req.session.message = "❌ 対応する料理が見つかりません。";
        return res.redirect("/")
    }

    //🚨"dishinfo.type"が"city"の場合：料理は固定都市に属していて、選択できない。→料理に指定されている都市へ強制適用。
    let targetCity;

    // 「都市選択」が必要なタイプのときだけ選択値を使う
    if (dishInfo.type === "color") {
        targetCity = req.body.selected_city;

        // 🚨都市未選択なら処理中止
        if (!targetCity) {
            req.session.message = "❌ 反映には都市を選んでください。";
            return res.redirect("/");
        }
    }

    // 「都市料理」タイプの場合は、固定都市へ強制適用
    if (dishInfo.type === "city") {
        targetCity = dishInfo.city;
    }
    req.session.completed_food = selectedDish;

    //🚨都市データが未定義なら初期値として登録する。該当都市が存在しない場合は空スコアで初期化する。
    req.session.city_data ??= JSON.parse(JSON.stringify(initialCityData));
    req.session.city_data[targetCity] ??= { red: 0, blue: 0, yellow: 0, black: 0, green: 0 };

    //🕹️新しい料理を履歴に記録"rebalanceCityScores()関数"で対象都市の思想スコアに+5%ずつ加算（合計100%超えないように自動調整）
    //🧩"rebalanceCityScores()関数"への変数
    req.session.applied_dishes.push(selectedDish);
    req.session.city_data[targetCity] = rebalanceCityScores(
        req.session.city_data[targetCity],//選ばれた都市のスコア(色ごとの数値)
        dishInfo.tags,//その影響色(dishData.jsonの"tag")。例)["red","green"]
        5//料理によって与える影響の量(ここでは5)
    );

    //🕹️反映された色のラベルと増加量をメッセージとして生成し、セッションに保存して表示する。
    const tagLabels = {
        red: "🔴 赤", blue: "🔵 青", yellow: "🟡 黄", black: "⚫ 黒", green: "🟢 緑"
    };
    const msg = dishInfo.tags.map(t => `${tagLabels[t] || t} +5%`).join(", ");
    req.session.message = `「${selectedDish}」を ${targetCity} に反映！ ${msg} 増やしました🌈`;

    //今までの処理をcityData.jsonにファイルとして保存する。
    fs.writeFileSync(
        path.join(__dirname, "public", "data", "cityData.json"),
        JSON.stringify(req.session.city_data, null, 2)
    );
    res.redirect("/");//処理がおわったらトップページに戻る
});

//💡チェック関数群(料理の素材があっているのか判定する)
//以下の3つのチェック関数は、app.get("/chef")より前に置く必要がある。
//関数を呼び出す前に定義する必要があるため。

//🚨半角文字(ABCや半角スペースなど)を全角文字(ＡＢＣや全角スペース)に変換する関数。
//🚨プレイヤーの入力に揺れがあるときでも正しく比較できるようにする
function convertToZenkaku(str) {
    return typeof str === "string"
        ? str
            .replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0))
            .replace(/ /g, "　")
        : str;
}

//全角変換付きの素材一致チェック。
//レシピとプレイヤー素材を両方"convertTozenkaku()"を使って揃えることで、入力表記ミスにも強い仕組みになっている。
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

//🚨素材がレシピに合っているかを判定する関数。
function matchesFoodEarth(recipeValue, playerValue) {
    //"recipeItems"にあるすべての素材が"platerItemsに含まれているのかチェックする。
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

//💡/chefのGETルート：プレイヤーが素材を持ってるか確認し、レシピに合ってたら料理が完成する
app.get("/chef", (req, res) => {
    //🕹️前回完成した料理の名前と、その詳細情報を読み込む。
    let completed_food = req.session.completed_food;
    const dishInfo = dishData.find(d => d.name === completed_food);
    const selectedCity = req.body?.selected_city || req.session.selected_city || null;

    //🕹️プレイヤーが持っている素材を取得する。
    //🚨存在しない場合は"未指定"を代入しておく。
    const {
        food_tree = "未指定",
        food_fish = "未指定",
        food_earth = "未指定",
        tool_house = "未指定"
    } = req.session;

    //🚨選択肢が複数ある場合は、最初の1つだけを使って比較するように調整する。
    const fish = Array.isArray(food_fish) ? food_fish[0] : food_fish;
    const tool = Array.isArray(tool_house) ? tool_house[0] : tool_house;

    //🧩/chefの時に表示されるメッセージ3つ
    let chef_message = "材料が揃っていないか、レシピに合っていないようです。";
    //🧩/cookingの中で定義調理が成功した時のメッセージ
    let chef_cooking = req.session.chef_cooking || "";//調理後の(完成した料理名)を調理しました。
    let chef_cooking2 = req.session.chef_cooking2 || "";//調理中のそれぞれの料理に対するメッセージ(dishData.jsonのmessageの内容)

    //🕹️（最重要)レシピごとに条件"condition"(dishData.json)がある
    //🕹️"matchesSimple"や"matchesFoodEarth"を使って素材がレシピと一致しているのか判定する
    //🕹️条件が合っていれば、"matchResult=true"にし、そのレシピを"matcch"として採用する
    const match = dishData.find(recipe => {
        const c = recipe.conditions || {};
        const matchResult =
            (!c.food_tree || matchesSimple(c.food_tree, food_tree)) &&
            (!c.food_fish || matchesSimple(c.food_fish, food_fish)) &&
            (!c.food_earth || matchesFoodEarth(c.food_earth, food_earth)) &&
            (!c.tool_house || matchesSimple(c.tool_house, tool_house));
        return matchResult;
    });

    //🧩調理が成功したら、完成料理として保存し、メッセージを変更。
    if (match) {
        completed_food = match.name;
        chef_message = match.message;
        req.session.completed_food = completed_food;
        req.session.chef_cooking = "";//メッセージを空にして、次の調理に向けて準備する
        req.session.chef_cooking2 = "";//メッセージを空にして、次の調理に向けて準備する
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

//💡✅ /cooking POSTルート：完成した料理を都市に反映して、素材を消費して、グラフに変化を記録する
app.post("/cooking", (req, res) => {
    console.log("✅ session at /cooking:", JSON.stringify(req.session, null, 2));
    //🕹️プレイヤーが完成させた料理名を取得。もし「なし」や「null」なら処理をストップ
    let completed_food = req.session.completed_food || null;

    //🕹️フォーム送信時の都市選択をセッションに保存。"color"タイプの料理なら、ここで選んだ都市が使われる。
    const selectedCity = req.body.selected_city || req.session.selected_city;
    req.session.selected_city = selectedCity;

    //🚨料理名が不正なら調理画面に戻る。
    if (!completed_food || completed_food === "なし") {
        req.session.message = "❌ まだ調理可能な料理がありません！";
        return res.redirect("/chef");
    }

    //🚨該当する料理がデータ(dishData.json)に存在するかを確認。なければエラー。
    const dishInfo = dishData.find(d => d.name === completed_food);
    if (!dishInfo) {
        req.session.message = "❌ 不明な料理が選択されました。";
        return res.redirect("/chef");
    }

    //🕹️完成した料理を料理の履歴に追加。
    req.session.completed_dishes ??= [];
    if (!req.session.completed_dishes.includes(completed_food)) {
        req.session.completed_dishes.push(completed_food);
    }

    //🕹️都市の選択を判定。都市データの反映先がここで決まる。
    const selected_city = dishInfo.type === "city"
        ? dishInfo.city            // 固定都市ならレシピ側の"city"を採用
        : req.session.selected_city; // 色料理ならユーザーが選んだ都市を使う

    //🚨都市のデータがなければ初期値化して、存在しなければ、エラーに。
    req.session.city_data ??= JSON.parse(JSON.stringify(initialCityData));
    req.session.city_data[selected_city] ??= JSON.parse(JSON.stringify(initialCityData[selected_city] || {}));

    //🚨"selected_city"(料理の反映し先の都市)がセッション上にちゃんと存在するのかを確認する
    //🧩存在しない場合、エラーメッセージを"session.message"(ホーム)にセット
    if (!req.session.city_data[selected_city]) {
        req.session.message = `❌ "${selected_city}" の初期データが見つかりません。`;
        return res.redirect("/chef");
    }

    //🕹️変更後の都市のデータをcityData.jsonに保存し、円グラフのデータを更新する。
    fs.writeFileSync(
        path.join(__dirname, "public", "data", "cityData.json"),
        JSON.stringify(req.session.city_data, null, 2)
    );

    //🕹️料理に使った素材データをセッションから消して、再選択を促す。
    ["tool_house", "food_tree", "food_fish", "food_earth"].forEach(key => req.session[key] = null);

    ///🧩chefの画面で表示するメッセージ
    req.session.message = `「${completed_food}」が完成しました！素材を消費しました🍽️`;
    req.session.chef_cooking = `${completed_food} を調理しました。`;
    req.session.chef_cooking2 = dishInfo.message;

    res.redirect("/chef");
    return;
});

//スコア再調節関数(市の思想バランス補正)
function rebalanceCityScoresWithEffect(currentData, effect) {
    const cityScores = { ...currentData };

    // ① 影響を反映（マイナス防止）
    Object.entries(effect).forEach(([tag, change]) => {
        if (["red", "blue", "yellow", "black", "green"].includes(tag)) {
            const newValue = (cityScores[tag] || 0) + change;
            cityScores[tag] = Math.max(0, newValue);
        }
    });

    // ② 合計補正
    let total = Object.values(cityScores).reduce((sum, val) => sum + val, 0);
    const difference = total - 100;

    if (difference !== 0) {
        const adjustTags = Object.keys(cityScores).filter(tag => !(tag in effect));
        const perTag = adjustTags.length > 0 ? difference / adjustTags.length : 0;

        adjustTags.forEach(tag => {
            cityScores[tag] = Math.max(0, cityScores[tag] - perTag); // 差を加減
        });

        // 再計算して誤差分調整（四捨五入前）
        total = Object.values(cityScores).reduce((sum, val) => sum + val, 0);
    }

    // ③ 四捨五入
    Object.keys(cityScores).forEach(tag => {
        cityScores[tag] = Math.round(cityScores[tag]);
    });

    // ④ 合計がズレた場合、最大値のタグに誤差分を足す
    const roundedTotal = Object.values(cityScores).reduce((sum, val) => sum + val, 0);
    const finalDiff = 100 - roundedTotal;

    if (finalDiff !== 0) {
        const maxTag = Object.keys(cityScores).reduce((a, b) =>
            cityScores[a] > cityScores[b] ? a : b
        );
        cityScores[maxTag] += finalDiff;
    }

    return cityScores;
}

//都市の思想スコアを更新する関数
//"tag"と"city"dishData.jsonにあり、それぞれの料理に対する前者は色を、後者は都市を指す。
function applyEffectToSession(cityData, effect, city = "") {
    for (const tag in effect) {
        if (!cityData[city]) {
            cityData[city] = { red: 0, blue: 0, yellow: 0, black: 0, green: 0 };
        }//都市のデータが未定義なら、スコアを加算する前に初期値をいれる(安全対策）
        cityData[city][tag] = (cityData[city][tag] || 0) + effect[tag];
    }//"effect"に含まれる思考スコアを足し込む（赤＋10、など）
}

//政策選択処理(ターンごとニュースに応じて都市へ反映)
app.post("/apply_news_choice", (req, res) => {
    const { turn, choice, city = "minato" } = req.body;
    const newsPhases = require("./public/data/newsPhases.json");
    const news = newsPhases.find(n => n.turn == Number(turn));
    const selected = news?.choices.find(c => c.id === choice);

    req.session.city_data = req.session.city_data || {};
    req.session.processedChoices = req.session.processedChoices || [];
    req.session.message = null;

    if (req.session.processedChoices.includes(Number(turn))) {
        req.session.message = `ターン${turn}では既に決定済みです。他の選択肢は反映されません。`;
        return res.redirect("/");
    }

    // 🌐「無視」が選ばれた場合の処理
    if (choice === "ignore") {
        req.session.processedChoices.push(Number(turn));
        req.session.message = `ターン${turn}ではニュースを無視しました。`;
        req.session.currentTurn = Number(turn) + 1;
        return res.redirect("/");
    }

    // A or B が選ばれた場合の通常処理
    if (selected) {
        let regions = [];
        if (news?.penalty?.region === "全国") {
            regions = ["minato", "naniwa", "kitano", "misaki", "shirasagi"];
        } else {
            regions = news?.penalty?.region?.split("・") ?? [];
        }

        let regionMessages = [];

        regions.forEach(targetCity => {
            const currentData = req.session.city_data[targetCity] ?? {
                red: 0, blue: 0, yellow: 0, black: 0, green: 0
            };
            const updatedScores = rebalanceCityScoresWithEffect(currentData, selected.effect);
            req.session.city_data[targetCity] = updatedScores;

            // メッセージ作成用
            const tagLabels = {
                red: "統制🔴", blue: "教育🔵", yellow: "経済🟡", black: "無秩序⚫", green: "農業🟢"
            };
            const tags = Object.keys(selected.effect).filter(tag =>
                ["red", "blue", "yellow", "black", "green"].includes(tag)
            );
            const effectMsg = tags.map(t => {
                const diff = selected.effect[t];
                const label = tagLabels[t] || t;
                const sign = diff > 0 ? "+" : "";
                return `${label}${sign}${diff}%`;
            }).join(", ");

            regionMessages.push(`【${targetCity}】→ ${effectMsg}`);
        });


        req.session.processedChoices.push(Number(turn));

        req.session.message =
            `「${selected.text}」を選択しました（ターン${turn}）。\n` +
            regionMessages.join("\n");

        fs.writeFileSync(
            path.join(__dirname, "public", "data", "cityData.json"),
            JSON.stringify(req.session.city_data, null, 2)
        );

    }

    req.session.currentTurn = Number(turn) + 1;
    res.redirect("/");
});

//政策無視処理(プレイヤーが選択せずにスキップした場合)
app.post("/ignore-policy", (req, res) => {
    const turn = Number(req.body.turn);

    req.session.processedChoices = req.session.processedChoices || [];
    req.session.ignoredTurns = req.session.ignoredTurns || [];
    req.session.message = null;

    if (req.session.processedChoices.includes(turn)) {
        req.session.message = `ターン${turn}では既に選択済みのため、無視は反映されません。`;
        return res.redirect("/");
    }

    // ✅ 無視として記録（両方必要！）
    req.session.processedChoices.push(turn);
    req.session.ignoredTurns.push(turn);

    req.session.message = `🛑 政策を無視しました（ターン: ${turn}）`;
    req.session.currentTurn = turn + 1;

    res.redirect("/");
});

//ターン進行とペナルティ反映
app.post("/next-turn", (req, res) => {
    if (!req.session.city_data) {
        req.session.city_data = JSON.parse(JSON.stringify(cityData)); // cityData.json の内容
    }

    //現在のターンに+1するをセッションから受け取って定義する
    req.session.gameState.currentTurn += 1;
    const currentTurn = req.session.gameState.currentTurn;

    const newsPhases = require("./public/data/newsPhases.json");//jsonから全ターンのニュースに関する情報を読み込む
    const penaltySource = newsPhases.find(n =>
        n.penalty?.appearsOnTurn === currentTurn &&
        req.session.ignoredTurns?.includes(n.turn)
    );
    const penalty = penaltySource?.penalty;
    // ...省略（前のコードと同様）

    if (
        penalty &&
        req.session.ignoredTurns?.includes(currentTurn - 1) &&
        penalty.appearsOnTurn === currentTurn
    ) {
        const affectedCities =
            penalty.region === "全国"
                ? Object.keys(req.session.gameState.cityData)
                : penalty.region.split("・");

        let changeMessages = [];

        affectedCities.forEach(city => {
            req.session.gameState.cityData[city] ??= {
                red: 0, blue: 0, yellow: 0, black: 0, green: 0
            };

            const tags = Object.keys(penalty.effect).filter(tag =>
                ["red", "blue", "yellow", "black", "green"].includes(tag)
            );

            const currentData = req.session.city_data[city];
            const updatedScores = rebalanceCityScoresWithEffect(currentData, penalty.effect);

            req.session.city_data[city] = updatedScores;
            req.session.gameState.cityData[city] = updatedScores;

            // 各都市の変化を記録
            const tagLabels = {
                red: "統制🔴", blue: "教育🔵", yellow: "経済🟡", black: "無秩序⚫", green: "農業🟢"
            };
            const cityMsg = tags.map(t => {
                const diff = penalty.effect[t];
                const label = tagLabels[t] || t;
                const sign = diff > 0 ? "+" : "";
                return `${label} ${sign}${diff}%`;
            }).join(", ");

            changeMessages.push(`【${city}】に影響: ${cityMsg}`);
        });

        // 満足度の変化がある場合
        if ("satisfaction" in penalty.effect) {
            const sDiff = penalty.effect.satisfaction;
            const sSign = sDiff > 0 ? "+" : "";
            changeMessages.push(`🧑‍🤝‍🧑 満足度 ${sSign}${sDiff}pt`);
            req.session.gameState.satisfaction += sDiff;
        }

        // ファイルに保存
        fs.writeFileSync(
            path.join(__dirname, "public", "data", "cityData.json"),
            JSON.stringify(req.session.city_data, null, 2)
        );

        // メッセージとして表示
        req.session.message = `⚠️ ペナルティ発動！\n${changeMessages.join("\n")}`;
    }

    res.redirect("/");

});

// ✅ サーバー起動 (`app.listen()` は最後)
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

