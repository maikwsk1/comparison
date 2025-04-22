#Flaskのインポート
from flask import Flask, render_template,jsonify, request

#Pygameのインポート
import sys
import pygame
from pygame.locals import QUIT
import threading

#追加機能
import time
from PIL import Image #画像
import random
import pyautogui

#Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

#定義
count = 0

#ゲームスタートボタン：食べたいものをランダムに宣言
#AIに一度も聞かずに書いたコード
@app.route('/start',methods=['POST', 'GET'])
def start():
    food_options = ['焼きとうもろこし','かまぼこ']
    character_demand="主人公が食べたいものを表示します"
    if request.method == 'POST':
        random_food_option = random.choice(food_options)
        character_demand = "私は" + random_food_option + "が食べたいです。"
    return character_demand

@app.route('/contact_staff', methods=['GET', 'POST'])
def contact_staff():
    food_id = request.form.get("food_id", None)

    if not food_id:
        return "何が欲しいの？"

    return f"あなたは {food_id} が欲しいのですね。"

#欲しいものを入力
@app.route('/', methods=['GET', 'POST'])
def food_input():
    food_options = ['焼きとうもろこし','かまぼこ']
    food_id = None
    if request.method == 'POST':
        food_id = request.form.get('food_id', None)
    return render_template('index.html', food_id=food_id, food_options=food_options)


@app.route('/contact_staff', methods=['GET'])
def person_fish():
    if request.method == 'GET':
      food_id = request.form.get("food_id", None)

      if food_id is None:
        return "魚専門屋さんです。何が欲しいの？"

      if food_id == "かまぼこ":
        return "かまぼこが欲しいのなら魚と金槌を持ってきてね。"
      else:
        return f"申し訳ないですが、{food_id} は売っていません。"

@app.route('/ask_person_vegetables', methods=['GET', 'POST'])
def person_vegetables():
    food_id = request.form.get("food_id", None)
    if request.method == 'POST':
      if food_id is None:
        return "八百屋さんです。何が欲しいの？"
    if request.method == 'GET':
      if food_id == "焼きとうもろこし":
        return "焼きとうもろこしが欲しいのならとうもろこしと火を持ってきてね。"
      else:
        return f"申し訳ないですが、{food_id} は売っていません。"

@app.route('/submit',methods=['GET', 'POST'])
def submit():
    food = None
    if request.method == 'POST':
        food = request.form.get('food', '未指定')
        print(food)
    return render_template('index.html', food=food)




@app.route('/about')
def about():
    food_options = ['焼きとうもろこし','かまぼこ']
    return render_template('about.html',food_options=food_options)



#カウント変数の定義
@app.route("/count", methods=["GET"])
def get_count():
    global count
    return jsonify({"count": count})

#カウント変数を増加させる関数
@app.route("/increment", methods=["POST"])
def increment():
    global count
    count += 1
    return jsonify({"count": count})

#カウント変数をリセットさせる関数
@app.route("/reset", methods=["POST"])
def reset():
    global count
    count = 0
    return jsonify({"count" :count})

#threadingを使った別スレッドでの実行
@app.route('/main')
def main():
    threading.Thread(target=run_pygame).start()
    return "Pygameを別スレッドで実行しました。"

#pygameの起動
def run_pygame():
    pygame.init()#初期化
    SURFACE = pygame.display.set_mode((400,300))#ウィンドウのサイズ指定
    pygame.display.set_caption("JustWindow")

    running = True
    while running:
        SURFACE.fill((255,255,255))

        for event in pygame.event.get():
            if event.type == QUIT:
                running = False

        pygame.draw.circle(SURFACE,(0,255,0),(50,150),20,10)
        pygame.display.update()
    pygame.quit()
    sys.exit()

#アプリケーションの実行
if __name__ == '__main__':
    app.run(debug=True)