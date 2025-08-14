# Flask のインポート
from flask import Flask, render_template, jsonify, request, session, flash, redirect, url_for, send_from_directory
# 追加機能
import random

# Flask アプリケーションのインスタンスを作成
app = Flask(__name__)
app.secret_key = "your_secret_key"  

#画像を表示するための処理
@app.route('/assets/<path:filename>')
def custom_static(filename):
    return send_from_directory('../assets', filename)


@app.route('/start', methods=['POST', 'GET'])
def start():
    food_options = ['焼きとうもろこし', 'かまぼこ']

    session.setdefault('character_demand')

    if request.method == 'POST':
        random_food_option = random.choice(food_options)
        session['character_demand'] = f" {random_food_option} が食べたい！"
    session.modified = True  
    return jsonify(character_demand=session['character_demand'])

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template(
        'index.html'
    )

@app.route('/clear', methods=['POST'])
def clear():
    completed_food = session.get('completed_food', None)
    character_demand = session.get('character_demand', None)

    if completed_food and character_demand and completed_food in character_demand:
        session['result_message'] = "ありがとう！ゲームクリア！！"
    else:
        session['result_message'] = "違うものがほしかった。"

    return redirect(url_for('food_input'))  

@app.route('/contact_staff', methods=['GET', 'POST'])
def contact_staff():
    selected_source = session.get('selectedSource', None)
    food_id = session.get('food_id', None)
    source = request.args.get("source", None)

    if request.method == 'GET' and source:
        session['selectedSource'] = source
        session.modified = True  

    if request.method == 'POST':
        food_id = request.form.get("food_id", None)
        if food_id:
            session['food_id'] = food_id
        if not session.get('selectedSource'):
            message= "❌ 先に専門家にレシピを聞いてください。"
            return render_template('contact_staff.html', message=message)
        if not session.get('food_id'):
            message=  "❌ 食べ物が選択されていません！"
            return render_template('contact_staff.html', message=message)

        if session.get('selectedSource') == "fish":
            if session.get('food_id') == "かまぼこ":
                message= "かまぼこが欲しいのなら、ヒラメと金槌を持ってきてね。"
                message2="⭕➂正しい専門家を選択し、レシピを聞くことができました。"
                return render_template('contact_staff.html', message=message, message2=message2)
            else:
                message= f"申し訳ないですが、{session.get('food_id', '未設定')}は他の専門家に聞いてください。"
                return render_template('contact_staff.html', message=message)

        elif session.get('selectedSource') == "vegetables":
            if session.get('food_id') == "焼きとうもろこし":
                message= "焼きとうもろこしが欲しいなら、とうもろこしとオーブンレンジを持ってきてね。"
                message2="⭕➂正しい専門家を選択し、レシピを聞くことができました。"
                return render_template('contact_staff.html', message=message, message2=message2)
            else:
                message=  f"申し訳ないですが、{session.get('food_id', '未設定')} は他の専門家に聞いてください。"
                return render_template('contact_staff.html', message=message)

    if session.get('selectedSource') == "fish":
        message= "魚の専門家です。何が欲しいのか、入力欄で教えてください！"
        return render_template('contact_staff.html', message=message)
    
    elif session.get('selectedSource') == "vegetables":
        message= "野菜の専門家です。何が欲しいのか、入力欄で教えてください！"
        return render_template('contact_staff.html', message=message)
    else:
        message= "❌ 順番が間違っています。先に専門家にレシピを聞いてください。"
        return render_template('contact_staff.html', message=message)

@app.route('/reset_session', methods=['POST'])
def reset_session():
    session.clear()  
    session['character_demand'] = "決定後に表示"
    session.modified = True  
    return jsonify(character_demand=session.get('character_demand'), result_message=session.get('result_message'))
@app.route('/finding_things', methods=['GET', 'POST'])
def finding_things():
    source = request.args.get('source') or session.get('source')
    session['source'] = source  # 選択をセッションに保存

    # POST処理：選択された素材をセッションに保存
    if request.method == 'POST':
        selected_item = request.form.getlist('selectedItem')  # 複数選択対応

        def convert_to_zenkaku(text):
            return text.replace(' ', '　')  # 半角スペースを全角に変換（例）

        selected_array = [convert_to_zenkaku(item) for item in selected_item] if selected_item else []

        if source == "house":
            session['tool_house'] = selected_array
            session['message'] = "🏠 無事に入手できました。持ち物が追加されました！"

        elif source == "tree":
            session['food_tree'] = selected_array
            session['message'] = "🌳 無事に収穫できました。持ち物が追加されました！"

        elif source == "submarine":
            session['food_fish'] = selected_array
            session['message'] = "🌊 無事に漁獲できました。持ち物が追加されました！"

        elif source == "earth":
            current_earth = session.get('food_earth', [])
            if not isinstance(current_earth, list):
                current_earth = []

            combined_earth = list(set(current_earth + selected_array))

            if len(combined_earth) > 3:
                session['message'] = "⚠️ 地球素材は最大3つまでです。リセットして選び直してください！"
            else:
                session['food_earth'] = combined_earth
                session['message'] = "🌍 地球から素材をゲット！持ち物に追加されました。"

        else:
            session['message'] = "❌ 不明な探索元です。"

        session['selected_item'] = selected_item
        return redirect(url_for('finding_things', source=source))

    # GET処理：素材とタイトルの表示
    message = session.pop('message', '')
    items = []
    title = "❌ 何も見つかりませんでした！"

    if source == "house":
        items = [
            "煮込み鍋", "鉄板", "フライ器", "たこ焼き器", "お弁当詰め工程", "包み布", "焼き型",
            "ワンプレート皿", "炒め釜", "乾燥炉", "煮込み釜", "蒸籠", "冷却皿", "炙り皿"
        ]
        title = "🏠 家の中にある道具と加工品"
    elif source == "tree":
        items = [
            "根菜セット（にんじん・じゃがいも）", "乾物野菜セット（海苔・しらす）", "野菜セット（大根・ねぎ）",
            "キャベツ山", "色野菜盛り（にんじん・ピーマン）", "保存野菜", "山菜", "トマト", "お肉",
            "牛乳", "野菜あん", "炒めバターコーン"
        ]
        title = "🌳 森の中の食材"
    elif source == "submarine":
        items = [
            "海鮮ミックス（イカ・桜えび）", "タコ切片", "魚切身（鮭）", "魚切身（鯖）", "出汁（煮干し・昆布）"
        ]
        title = "🌊 海の中の食材"
    elif source == "earth":
        items = [
            "香辛料パック（カレー粉・スパイス）", "白米", "味噌", "乾麺", "麦粉・小麦粉セット（ラーメン・お好み焼き・パン）",
            "衣粉セット（パン粉・卵）", "寒地小麦麺と焙煎味噌", "洋風粉末とカツ素材（魚or豚）", "麺", "うどん",
            "ソーセージ", "小麦粉", "塩", "パン", "砂糖", "オイル", "あんこ", "もち米"
        ]
        title = "🌍 地球から得られる素材"

    return render_template(
        'finding_things.html',
        title=title,
        items=items,
        source=source,
        message=message,
        selected_item=session.get('selected_item')
    )


@app.route('/chef')
def chef():
    food_tree = session.get('food_tree', '未指定')
    tool_house = session.get('tool_house', '未指定')
    food_fish = session.get('food_fish', '未指定')

    completed_food = "なし"  

    # 焼きとうもろこしチェック
    if food_tree == "とうもろこし" and tool_house == "オーブンレンジ":
        chef_message = "焼きとうもろこしの材料が揃ったので、作ります！"
        completed_food = "焼きとうもろこし"

    # かまぼこチェック
    elif food_fish == "ヒラメ" and tool_house == "金槌":
        chef_message = "かまぼこの材料が揃ったので、作ります！"
        completed_food = "かまぼこ"

    # 部分的に足りてる
    elif (
        (food_tree in ["とうもろこし", "オーブンレンジ"] or tool_house in ["とうもろこし", "オーブンレンジ"])
        or (food_fish in ["ヒラメ", "金槌"] or tool_house in ["ヒラメ", "金槌"])
    ):
        chef_message = "まだ何かが足りていません。"

    # 何も足りていない
    else:
        chef_message = "材料を持ってきてください。"
    session['completed_food'] = completed_food
    return render_template(
        'chef.html',
        chef_message=chef_message,
        food_tree=food_tree,
        tool_house=tool_house,
        food_fish=food_fish,
        completed_food=completed_food  
    )

@app.route('/cooking', methods=['GET', 'POST'])
def cooking():
    completed_food = session.get('completed_food', None)
    if request.method == 'POST':
         chef_cooking = f"{completed_food} を調理しました。" if completed_food and completed_food != "なし" else "調理するものが選ばれていません。"
         chef_cooking2 = "➄料理長に材料を渡し、調理してもらうことができました。"
         return render_template('chef.html', chef_cooking2=chef_cooking2, chef_cooking=chef_cooking, completed_food=completed_food)

    return render_template('chef.html', completed_food=completed_food)

# アプリケーションの実行
if __name__ == '__main__':
    app.run(debug=True)