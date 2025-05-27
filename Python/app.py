# Flask のインポート
from flask import Flask, render_template, jsonify, request, session, flash, redirect, url_for


# Pygame のインポート
import sys
import pygame
from pygame.locals import QUIT
import threading

# 追加機能
import time
from PIL import Image  # 画像
import random
import pyautogui

# Flask アプリケーションのインスタンスを作成
app = Flask(__name__)



app.secret_key = "your_secret_key"  # セッションの暗号化キー
@app.route('/start', methods=['POST', 'GET'])
def start():
    food_options = ['焼きとうもろこし', 'かまぼこ']

    session.setdefault('character_demand')

    if request.method == 'POST':
        random_food_option = random.choice(food_options)
        session['character_demand'] = f"私は {random_food_option} が食べたいです。"

    session.modified = True  # ✅ セッションの変更を確実に反映

    return jsonify(character_demand=session['character_demand'])
@app.route('/', methods=['GET', 'POST'])
def food_input():
    session.setdefault('character_demand', "確定後表示")

    completed_food = session.get('completed_food', None)
    
    if request.method == 'POST':
        food_id = request.form.get('food_id', None)
        if not session.get('selectedSource'):
            return "❌ 店舗が選択されていません！ 先に店舗を選んでください。"

        session['food_id'] = food_id

    return render_template(
        'index.html',
        food_id=session.get('food_id', None),
        character_demand=session.get('character_demand'),
        food_tree=session.get('food_tree', None),
        tool_house=session.get('tool_house', None),
        food_fish=session.get('food_fish', None),
        completed_food=completed_food
    )

@app.route('/clear', methods=['POST'])
def clear():
    completed_food = session.get('completed_food', None)
    character_demand = session.get('character_demand', None)

    if completed_food and character_demand and completed_food in character_demand:
        session['result_message'] = "ありがとう！クリアしました。"
    else:
        session['result_message'] = "違うものがほしかった。"

    return redirect(url_for('food_input'))  # ✅ ページをリロードして反映

@app.route('/contact_staff', methods=['GET', 'POST'])
def contact_staff():
    selected_source = session.get('selectedSource', None)
    food_id = session.get('food_id', None)
    source = request.args.get("source", None)

    print(f"🔍 `contact_staff` リクエスト時の selectedSource: {selected_source}, food_id: {food_id}")

    # ✅ `GET` のリクエストで店舗選択をセット
    if request.method == 'GET' and source:
        session['selectedSource'] = source
        session.modified = True  # ✅ セッションの変更を明示
        print(f"✅ `selectedSource` を更新 (GET): {session.get('selectedSource')}")

    # ✅ `POST` の場合、食べ物の処理
    if request.method == 'POST':
        food_id = request.form.get("food_id", None)
        if food_id:
            session['food_id'] = food_id
            print(f"✅ `food_id` を更新: {session['food_id']}")

        if not session.get('selectedSource'):
            message= "❌ 先に専門家にレシピを聞いてください。"
            return render_template('contact_staff.html', message=message)
        if not session.get('food_id'):
            message=  "❌ 食べ物が選択されていません！"
            return render_template('contact_staff.html', message=message)

        # ✅ `POST` のリクエスト時に食べ物の処理
        if session.get('selectedSource') == "fish":
            if session.get('food_id') == "かまぼこ":
                message= "かまぼこが欲しいのならヒラメと金槌を持ってきてね。"
                return render_template('contact_staff.html', message=message)
            
            else:
                message= f"申し訳ないですが、{session.get('food_id', '未設定')} は売っていません。"
                return render_template('contact_staff.html', message=message)

        elif session.get('selectedSource') == "vegetables":
            if session.get('food_id') == "焼きとうもろこし":
                message= "焼きとうもろこしが欲しいならとうもろこしとオーブンレンジを持ってきてね。"
                return render_template('contact_staff.html', message=message)
            else:
                message=  f"申し訳ないですが、{session.get('food_id', '未設定')} は売っていません。"
                return render_template('contact_staff.html', message=message)

    # ✅ `GET` の場合、店舗の基本メッセージを表示
    if session.get('selectedSource') == "fish":
        message= "魚の専門家です。何が欲しいですか？"
        return render_template('contact_staff.html', message=message)
    
    elif session.get('selectedSource') == "vegetables":
        message= "野菜の専門家です。何が欲しいですか？"
        return render_template('contact_staff.html', message=message)
    else:
        message= "❌ 先に専門家にレシピを聞いてください。"
        return render_template('contact_staff.html', message=message)


@app.route('/reset_session', methods=['POST'])
def reset_session():
    session.clear()  # ✅ セッションを完全にクリア

    # ✅ 初期値を適切にセット
    session['character_demand'] = "決定後に表示"

    session.modified = True  # ✅ 変更を明示する

    print(f"🔄 `reset_session()` 実行！ character_demand={session.get('character_demand')}")

    return jsonify(character_demand=session.get('character_demand'), result_message=session.get('result_message'))

@app.route('/finding_things', methods=['GET', 'POST'])
def finding_things():
    foods_tree = ['とうもろこし', 'かぶ']
    tools_house = ['オーブンレンジ', '金槌']
    foods_fish = ['ヒラメ', '金魚']

    source = request.args.get('source', 'default')

    if request.method == 'POST':
        food_tree = request.form.get('food_tree')
        tool_house = request.form.get('tool_house')
        food_fish = request.form.get('food_fish')

        # ✅ 修正: 値が存在する場合のみ `session` に保存
        if food_tree:
            session['food_tree'] = food_tree
            flash("収穫しました！", "success")
        if tool_house:
            session['tool_house'] = tool_house
            flash("入手しました！", "success")
        if food_fish:
            session['food_fish'] = food_fish
            flash("漁獲しました！", "success")
        return redirect(url_for('finding_things'))

    return render_template(
        'finding_things.html', 
        source=source, 
        foods_tree=foods_tree, 
        food_tree=session.get('food_tree', None), 
        tools_house=tools_house, 
        tool_house=session.get('tool_house', None),
        foods_fish=foods_fish, 
        food_fish=session.get('food_fish', None), 
    )


@app.route('/chef')
def chef():
    food_tree = session.get('food_tree', '未指定')
    tool_house = session.get('tool_house', '未指定')
    food_fish = session.get('food_fish', '未指定')

    completed_food = "なし"  # 完成した料理名を記録する変数

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
         return render_template('chef.html', chef_cooking=chef_cooking, completed_food=completed_food)

    return render_template('chef.html', completed_food=completed_food)


# アプリケーションの実行
if __name__ == '__main__':
    app.run(debug=True)