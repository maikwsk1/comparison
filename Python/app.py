# Flask のインポート
from flask import Flask, render_template, jsonify, request, session

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


# 定義
count = 0

# ゲームスタートボタン：食べたいものをランダムに宣言
# AIに一度も聞かずに書いたコード
@app.route('/start', methods=['POST', 'GET'])
def start():
    food_options = ['焼きとうもろこし', 'かまぼこ']
    character_demand = "主人公が食べたいものを表示します"
    if request.method == 'POST':
        random_food_option = random.choice(food_options)
        character_demand = f"私は {random_food_option} が食べたいです。"
    return character_demand

# 欲しいものを入力
@app.route('/', methods=['GET', 'POST'])
def food_input():
    food_id = None
    if request.method == 'POST':
        food_id = request.form.get('food_id', None)
    return render_template('index.html', food_id=food_id)

@app.route('/contact_staff', methods=['GET', 'POST'])
def contact_staff():
    if request.method == 'POST':
        source = request.form.get("source", None)  # ✅ フォームから `source` を取得
    else:
        source = request.args.get("source", None)  # ✅ URL から `source` を取得

    food_id = request.form.get("food_id", None)
    print(f"🔍 Debug: Received source={source}, food_id={food_id}, Type={type(source)}")  # ✅ デバッグログ追加

    if not source:
        return "❌ 店舗が選択されていません。"

    message = ""

    if source == "fish":
        if not food_id:
            message = "🐟 魚専門屋さんです。何が欲しいの？"
        elif food_id == "かまぼこ":
            message = "かまぼこが欲しいのなら魚と金槌を持ってきてね。"
        else:
            message = f"申し訳ないですが、{food_id} は売っていません。"

    elif source == "vegetables":
        if not food_id:
            message = "🥦 八百屋さんです。何が欲しいの？"
        elif food_id == "焼きとうもろこし":
            message = "⭕ 焼きとうもろこしは正解です！とうもろこしと火を持ってきてね。"
        else:
            message = f"申し訳ないですが、{food_id} は売っていません。"

    return render_template('contact_staff.html', message=message)

@app.route('/submit', methods=['GET', 'POST'])
def submit():
    food = None
    if request.method == 'POST':
        food = request.form.get('food', '未指定')
        print(food)
    return render_template('index.html', food=food)

@app.route('/about')
def about():
    food_options = ['焼きとうもろこし', 'かまぼこ']
    return render_template('about.html', food_options=food_options)

# カウント変数の定義
@app.route("/count", methods=["GET"])
def get_count():
    global count
    return jsonify({"count": count})

# カウント変数を増加させる関数
@app.route("/increment", methods=["POST"])
def increment():
    global count
    count += 1
    return jsonify({"count": count})

# カウント変数をリセットさせる関数
@app.route("/reset", methods=["POST"])
def reset():
    global count
    count = 0
    return jsonify({"count": count})

# threading を使った別スレッドでの実行
@app.route('/main')
def main():
    threading.Thread(target=run_pygame).start()
    return "Pygameを別スレッドで実行しました。"

# Pygame の起動
def run_pygame():
    pygame.init()  # 初期化
    SURFACE = pygame.display.set_mode((400, 300))  # ウィンドウのサイズ指定
    pygame.display.set_caption("JustWindow")

    running = True
    while running:
        SURFACE.fill((255, 255, 255))

        for event in pygame.event.get():
            if event.type == QUIT:
                running = False

        pygame.draw.circle(SURFACE, (0, 255, 0), (50, 150), 20, 10)
        pygame.display.update()
    pygame.quit()
    sys.exit()

# アプリケーションの実行
if __name__ == '__main__':
    app.run(debug=True)