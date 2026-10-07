// Wall Rally - Akashic Engine v3 / 単体公開用（Playgama・広告・ニコ生連携なし）
// 言語は、起動時にブラウザの言語に合わせ、ゲーム内の「Language」ボタンでも切り替えられる
// 画面 1280x720 / fps 30 想定（元HTML版は60fps想定の値を F=2 倍して移植）

function main() {
	var W = 1280;
	var H = 720;
	var F = 2; // 60fps -> 30fps の補正倍率

	// ================= 設定 =================
	var DEFAULT_LANG = "en"; // ブラウザの言語が未対応のときに使う言語

	// 言語選択ボタンに出す言語（日本語以外）。表示名は各言語の自国語表記。
	// 追加するときは、ここに1行足して、下の TEXT にも同じコードを足す
	var LANG_MENU = [
		{ code: "en", name: "English" },
		{ code: "es", name: "Español" },
		{ code: "pt", name: "Português" },
		{ code: "fr", name: "Français" },
		{ code: "de", name: "Deutsch" },
		{ code: "ru", name: "Русский" },
		{ code: "zh", name: "简体中文" },
		{ code: "ko", name: "한국어" }
	];

	// 画像ファイル（拡張子なしのアセットID）
	var ID_BG = "2323";    // 背景（一番下）
	var ID_WALL = "2324";  // 壁エリア（この範囲内でボールが当たる。範囲外は透過）
	var ID_NET = "2325";   // ネットエリア（表示のみ。触れない・演出なし）
	var ID_RULE = "3333"; // ルール画面の背景画像（この画像の面積の中にルール文を描く）
	var RULE_PANEL_OPACITY = 0.55; // ルール文字の下に敷く黒い板の濃さ(0〜1)

	var PLAY_TIME = 120;           // 1回のプレイ時間(秒)
	var RESULT_SCORE_OFFSET_Y = 130; // 結果画像(高さ180)の上端からスコア文字までの距離
	var HIT_POPUP_FRAMES = 18;       // ヒット位置のスコア表示の長さ(フレーム)
	var RESULT_RED_SCORE = 10000;    // このスコア以上は赤文字（それ未満は黒文字）
	var REPLAY_SCORE_LIMIT = 30000; // このスコア以上なら「やめる」だけ表示。常に再プレイを出したいなら大きな値にする

	// --- 壁・特殊ボール(nc490164kan.png)・コンボのルール ---
	var WALL_POINTS = 100;          // 壁(2324)へのヒット
	var SPECIAL_BASE_POINTS = 350;  // 特殊ボールの基本スコア（倍率 1.0）
	var BACKHAND_MULT = 1.1;        // バックハンドで打ち返したときのスコア倍率
	var SPECIAL_TIME_ADD = 5;       // 特殊ボールのタイム加算(秒)
	var SPECIAL_TIME_ADD_HIGH = 6;  // 30コンボ以上のタイム加算(秒)
	var COMBO_TIER1 = 20;           // この数以上: スコア1.2倍 / 出現確率アップ
	var COMBO_TIER2 = 30;           // この数以上: スコア1.5倍 / タイム+6秒
	var MULT_TIER1 = 1.2;
	var MULT_TIER2 = 1.5;
	var SPECIAL_CHANCE = 0.30;             // 通常の出現確率
	var SPECIAL_CHANCE_HIGH = 0.35;        // 20コンボ以上の出現確率
	var SPECIAL_CHANCE_CONSECUTIVE = 0.15; // 前回も出現していた場合の出現確率
	var BONUS_SIZE = 90;
	var BONUS_Y_MIN = 170;          // 特殊ボールが出る高さの範囲
	var BONUS_Y_MAX = 420;
	var BONUS_EDGE_MARGIN = 10;     // 缶が壁エリアの縁からこのpx以上内側に収まる位置にだけ出す

	// ボールの軌道
	var ARC_HEIGHT = 70;            // 打球が上へ描く弧の高さ(px)
	var CURVE_X = 90;               // 左右スワイプ時の横カーブの膨らみ(px)
	var BOUNCE_REACH = 2;           // 壁で跳ね返った後、左右に何レーンまで散らすか
	var BOUNCE_CENTER_WEIGHT = 0.6; // プレイヤーの真下へ返る確率の重み（他のレーンは 1.0）

	// スワイプ判定(px・画面座標 1280x720 基準)
	var TAP_MAX = 30;        // これ未満の動き = タップ（ボタン操作）
	var MOVE_MIN = 50;       // 横スワイプで移動する最小距離
	var MOVE_FAR = 260;      // これ以上の長い横スワイプは2レーン移動
	var HIT_MIN = 40;        // 縦・斜めスワイプ（打撃）の最小の縦移動
	var COURSE_DX = 40;      // 打撃スワイプで左/右コースと判定する横移動

	var lanes = [256, 512, 640, 768, 1024];

	// ================= 表示テキスト =================
	function plus(unit) { return function (n) { return "+" + n + unit; }; }
	var TEXT = {
		en: {
			title: "Wall Rally",
			chooseHand: "Choose your dominant hand",
			left: "Left-handed", right: "Right-handed", howTo: "How to Play",
			back: "Back", replay: "Replay", quit: "Quit",
			timeLbl: "Time: ", timeUnit: "s", scoreLbl: "Score: ", bestLbl: "Best: ", comboLbl: "Combo: ",
			speedLbl: "Speed: Lv.", livesLbl: "Lives: ", stanceLbl: "Stance: ",
			forehand: "Forehand", backhand: "Backhand", plusSec: plus("s"),
			rank: {
				n: "Must be some mistake, right?",
				kr: "You're just getting started!",
				kkk: "You're a genius!",
				i: "Not bad at all!",
				s: "I think you've got talent.",
				f: "You could go pro, you know?",
				k: "Creepy! [Congratulations!]"
			},
			rule: {
				title: "How to Play",
				thanks: "Thank you for playing this game!",
				ai: "[About 90% of this game was made with the help of AI.]",
				ctrlHead: "Controls",
				c1: "1. Flick sideways to move. Flick in any of 3 vertical directions to hit the ball.",
				c2: "2. Hit a can with the ball for +{t} sec on the timer (+{T} sec at {c}+ combo).",
				scoreHead: "Score",
				colWhere: "Where you hit", colFore: "Forehand", colBack: "Backhand",
				wall: "Wall",
				sp1: "Special ball (under {x} combo)",
				sp2: "Special ball ({x}-{y} combo)",
				sp3: "Special ball ({c}+ combo)",
				note: "The starting language follows your browser's language (English if it is not supported). You can change it with the Language button."
			}
		},
		es: {
			title: "Wall Rally",
			chooseHand: "Elige tu mano dominante",
			left: "Zurdo", right: "Diestro", howTo: "Cómo jugar",
			back: "Volver", replay: "Jugar de nuevo", quit: "Salir",
			timeLbl: "Tiempo: ", timeUnit: "s", scoreLbl: "Puntos: ", bestLbl: "Récord: ", comboLbl: "Combo: ",
			speedLbl: "Velocidad: Nv.", livesLbl: "Vidas: ", stanceLbl: "Postura: ",
			forehand: "Derecha", backhand: "Revés", plusSec: plus("s"),
			rank: {
				n: "Debe de haber un error, ¿no?",
				kr: "¡Esto apenas empieza!",
				kkk: "¡Eres un genio!",
				i: "¡Nada mal!",
				s: "Creo que tienes talento.",
				f: "¿Sabes que podrías ser profesional?",
				k: "¡Qué miedo! [¡Felicidades!]"
			},
			rule: {
				title: "Cómo jugar",
				thanks: "¡Gracias por jugar!",
				ai: "[Alrededor del 90 % de este juego se creó con ayuda de IA.]",
				ctrlHead: "Controles",
				c1: "1. Desliza hacia los lados para moverte. Desliza en una de las 3 direcciones verticales para golpear la pelota.",
				c2: "2. Si la pelota golpea una lata, ganas +{t} s de tiempo (+{T} s con {c}+ de combo).",
				scoreHead: "Puntuación",
				colWhere: "Dónde golpeas", colFore: "Derecha", colBack: "Revés",
				wall: "Pared",
				sp1: "Bola especial (menos de {x} de combo)",
				sp2: "Bola especial ({x}-{y} de combo)",
				sp3: "Bola especial ({c}+ de combo)",
				note: "El idioma inicial depende del idioma de tu navegador (inglés si no es compatible). Puedes cambiarlo con el botón Language."
			}
		},
		pt: {
			title: "Wall Rally",
			chooseHand: "Escolha sua mão dominante",
			left: "Canhoto", right: "Destro", howTo: "Como jogar",
			back: "Voltar", replay: "Jogar de novo", quit: "Sair",
			timeLbl: "Tempo: ", timeUnit: "s", scoreLbl: "Pontos: ", bestLbl: "Recorde: ", comboLbl: "Combo: ",
			speedLbl: "Velocidade: Nv.", livesLbl: "Vidas: ", stanceLbl: "Postura: ",
			forehand: "Forehand", backhand: "Backhand", plusSec: plus("s"),
			rank: {
				n: "Deve ser algum engano, né?",
				kr: "Você está só começando!",
				kkk: "Você é um gênio!",
				i: "Nada mal!",
				s: "Acho que você tem talento.",
				f: "Você poderia virar profissional, sabia?",
				k: "Assustador! [Parabéns!]"
			},
			rule: {
				title: "Como jogar",
				thanks: "Obrigado por jogar!",
				ai: "[Cerca de 90% deste jogo foi feito com ajuda de IA.]",
				ctrlHead: "Controles",
				c1: "1. Deslize para os lados para se mover. Deslize em uma das 3 direções verticais para rebater a bola.",
				c2: "2. Acertar uma lata com a bola dá +{t} s ao tempo (+{T} s com {c}+ de combo).",
				scoreHead: "Pontuação",
				colWhere: "Onde acertou", colFore: "Forehand", colBack: "Backhand",
				wall: "Parede",
				sp1: "Bola especial (menos de {x} de combo)",
				sp2: "Bola especial ({x}-{y} de combo)",
				sp3: "Bola especial ({c}+ de combo)",
				note: "O idioma inicial depende do idioma do seu navegador (inglês se não houver suporte). Você pode mudá-lo no botão Language."
			}
		},
		fr: {
			title: "Wall Rally",
			chooseHand: "Choisissez votre main dominante",
			left: "Gaucher", right: "Droitier", howTo: "Comment jouer",
			back: "Retour", replay: "Rejouer", quit: "Quitter",
			timeLbl: "Temps: ", timeUnit: "s", scoreLbl: "Score: ", bestLbl: "Meilleur: ", comboLbl: "Combo: ",
			speedLbl: "Vitesse: Niv.", livesLbl: "Vies: ", stanceLbl: "Posture: ",
			forehand: "Coup droit", backhand: "Revers", plusSec: plus("s"),
			rank: {
				n: "Il doit y avoir une erreur, non ?",
				kr: "Ce n'est que le début !",
				kkk: "Tu es un génie !",
				i: "Pas mal du tout !",
				s: "Je crois que tu as du talent.",
				f: "Tu pourrais passer pro, tu sais ?",
				k: "Flippant ! [Félicitations !]"
			},
			rule: {
				title: "Comment jouer",
				thanks: "Merci d'avoir joué !",
				ai: "[Environ 90 % de ce jeu a été réalisé avec l'aide de l'IA.]",
				ctrlHead: "Commandes",
				c1: "1. Balayez sur les côtés pour vous déplacer. Balayez dans l'une des 3 directions verticales pour frapper la balle.",
				c2: "2. Si la balle touche une canette, +{t} s au chrono (+{T} s à partir de {c} combos).",
				scoreHead: "Score",
				colWhere: "Où vous touchez", colFore: "Coup droit", colBack: "Revers",
				wall: "Mur",
				sp1: "Balle spéciale (moins de {x} combos)",
				sp2: "Balle spéciale ({x}-{y} combos)",
				sp3: "Balle spéciale ({c}+ combos)",
				note: "La langue de départ dépend de la langue de votre navigateur (anglais si elle n'est pas prise en charge). Vous pouvez la changer avec le bouton Language."
			}
		},
		de: {
			title: "Wall Rally",
			chooseHand: "Wähle deine Spielhand",
			left: "Linkshänder", right: "Rechtshänder", howTo: "Spielanleitung",
			back: "Zurück", replay: "Nochmal", quit: "Beenden",
			timeLbl: "Zeit: ", timeUnit: "s", scoreLbl: "Punkte: ", bestLbl: "Rekord: ", comboLbl: "Combo: ",
			speedLbl: "Tempo: Stufe ", livesLbl: "Leben: ", stanceLbl: "Haltung: ",
			forehand: "Vorhand", backhand: "Rückhand", plusSec: plus("s"),
			rank: {
				n: "Das muss ein Irrtum sein, oder?",
				kr: "Du fängst ja gerade erst an!",
				kkk: "Du bist ein Genie!",
				i: "Gar nicht schlecht!",
				s: "Ich glaube, du hast Talent.",
				f: "Du könntest Profi werden, weißt du?",
				k: "Gruselig! [Glückwunsch!]"
			},
			rule: {
				title: "Spielanleitung",
				thanks: "Danke fürs Spielen!",
				ai: "[Etwa 90 % dieses Spiels wurden mit Hilfe von KI erstellt.]",
				ctrlHead: "Steuerung",
				c1: "1. Wische zur Seite, um dich zu bewegen. Wische in eine der 3 senkrechten Richtungen, um den Ball zu schlagen.",
				c2: "2. Triffst du mit dem Ball eine Dose, gibt es +{t} Sek. Zeit (+{T} Sek. ab {c} Combo).",
				scoreHead: "Punkte",
				colWhere: "Treffer auf", colFore: "Vorhand", colBack: "Rückhand",
				wall: "Wand",
				sp1: "Spezialball (unter {x} Combo)",
				sp2: "Spezialball ({x}-{y} Combo)",
				sp3: "Spezialball (ab {c} Combo)",
				note: "Die Startsprache richtet sich nach der Sprache deines Browsers (Englisch, falls nicht unterstützt). Du kannst sie mit der Schaltfläche „Language“ ändern."
			}
		},
		ru: {
			title: "Wall Rally",
			chooseHand: "Выберите ведущую руку",
			left: "Левша", right: "Правша", howTo: "Как играть",
			back: "Назад", replay: "Ещё раз", quit: "Выход",
			timeLbl: "Время: ", timeUnit: " с", scoreLbl: "Очки: ", bestLbl: "Рекорд: ", comboLbl: "Комбо: ",
			speedLbl: "Скорость: ур.", livesLbl: "Жизни: ", stanceLbl: "Стойка: ",
			forehand: "Форхенд", backhand: "Бэкхенд", plusSec: plus(" с"),
			rank: {
				n: "Это какая-то ошибка, да?",
				kr: "Всё только начинается!",
				kkk: "Да ты гений!",
				i: "А ты неплох!",
				s: "Думаю, у тебя есть талант.",
				f: "Ты мог бы стать профи, знаешь ли?",
				k: "Жуть! [Поздравляем!]"
			},
			rule: {
				title: "Как играть",
				thanks: "Спасибо, что играете!",
				ai: "[Около 90% этой игры создано с помощью ИИ.]",
				ctrlHead: "Управление",
				c1: "1. Проведите пальцем вбок, чтобы двигаться. Проведите в одном из 3 вертикальных направлений, чтобы ударить по мячу.",
				c2: "2. Если мяч попадёт в банку, к таймеру добавится +{t} с (+{T} с при комбо {c}+).",
				scoreHead: "Очки",
				colWhere: "Куда попали", colFore: "Форхенд", colBack: "Бэкхенд",
				wall: "Стена",
				sp1: "Особый мяч (комбо меньше {x})",
				sp2: "Особый мяч (комбо {x}–{y})",
				sp3: "Особый мяч (комбо {c}+)",
				note: "Начальный язык зависит от языка вашего браузера (если он не поддерживается — английский). Его можно изменить кнопкой Language."
			}
		},
		zh: {
			title: "Wall Rally",
			chooseHand: "请选择惯用手",
			left: "左手", right: "右手", howTo: "玩法说明",
			back: "返回", replay: "再玩一次", quit: "退出",
			timeLbl: "剩余时间: ", timeUnit: "秒", scoreLbl: "得分: ", bestLbl: "最高分: ", comboLbl: "连击: ",
			speedLbl: "速度: Lv.", livesLbl: "生命: ", stanceLbl: "姿势: ",
			forehand: "正手", backhand: "反手", plusSec: plus("秒"),
			rank: {
				n: "这肯定是搞错了吧?",
				kr: "你才刚刚开始!",
				kkk: "你是天才!",
				i: "没想到你挺厉害嘛!",
				s: "我觉得你有天赋。",
				f: "你可以去当职业选手了吧?",
				k: "太可怕了!【恭喜】"
			},
			rule: {
				title: "玩法说明",
				thanks: "感谢你游玩本游戏!",
				ai: "【本游戏约90%是借助AI制作的。】",
				ctrlHead: "操作方法",
				c1: "1. 左右滑动来移动,向3个纵向方向之一滑动来击球。",
				c2: "2. 球击中罐子时,剩余时间+{t}秒(连击达到{c}以上时+{T}秒)。",
				scoreHead: "得分",
				colWhere: "击中位置", colFore: "正手", colBack: "反手",
				wall: "墙壁",
				sp1: "特殊球(连击不足{x})",
				sp2: "特殊球(连击{x}-{y})",
				sp3: "特殊球(连击{c}以上)",
				note: "初始语言取决于浏览器的语言(不支持时为英语)。可通过 Language 按钮更改。"
			}
		},
		ko: {
			title: "Wall Rally",
			chooseHand: "주로 쓰는 손을 선택하세요",
			left: "왼손잡이", right: "오른손잡이", howTo: "게임 방법",
			back: "뒤로", replay: "다시 하기", quit: "그만하기",
			timeLbl: "남은 시간: ", timeUnit: "초", scoreLbl: "점수: ", bestLbl: "최고 점수: ", comboLbl: "콤보: ",
			speedLbl: "속도: Lv.", livesLbl: "목숨: ", stanceLbl: "자세: ",
			forehand: "포핸드", backhand: "백핸드", plusSec: plus("초"),
			rank: {
				n: "뭔가 잘못된 거 아니야?",
				kr: "이제 시작일 뿐이야!",
				kkk: "너 천재구나!",
				i: "의외로 잘하는데!",
				s: "재능이 있는 것 같아.",
				f: "프로도 될 수 있겠는데?",
				k: "소름 돋아! [축하해]"
			},
			rule: {
				title: "게임 방법",
				thanks: "이 게임을 플레이해 주셔서 감사합니다!",
				ai: "[이 게임의 약 90%는 AI를 활용해 만들었습니다.]",
				ctrlHead: "조작 방법",
				c1: "1. 좌우로 플릭하면 이동하고, 세로 3방향 중 하나로 플릭하면 공을 칩니다.",
				c2: "2. 공이 캔에 맞으면 제한 시간 +{t}초 (콤보 {c} 이상이면 +{T}초).",
				scoreHead: "점수",
				colWhere: "맞힌 곳", colFore: "포핸드", colBack: "백핸드",
				wall: "벽",
				sp1: "특수 공 (콤보 {x} 미만)",
				sp2: "특수 공 (콤보 {x}~{y})",
				sp3: "특수 공 (콤보 {c} 이상)",
				note: "시작 언어는 브라우저의 언어에 따라 정해집니다(지원하지 않으면 영어). Language 버튼으로 바꿀 수 있습니다."
			}
		},
		// 日本語（言語メニューには出さない。ブラウザが日本語なら自動で日本語になる）
		ja: {
			title: "壁打ちゲーム",
			chooseHand: "利き手を選んでください",
			left: "左利き", right: "右利き", howTo: "遊び方",
			back: "戻る", replay: "再プレイ", quit: "やめる",
			timeLbl: "残り時間: ", timeUnit: "秒", scoreLbl: "スコア: ", bestLbl: "ハイスコア: ", comboLbl: "コンボ: ",
			speedLbl: "スピード: Lv.", livesLbl: "残基: ", stanceLbl: "構え: ",
			forehand: "フォア", backhand: "バックハンド", plusSec: plus("秒"),
			rank: {
				n: "なにかの間違いだろ?",
				kr: "これからだ!",
				kkk: "君は天才だ!",
				i: "意外とやるじゃん!",
				s: "才能あると思う",
				f: "プロになれるよ?",
				k: "キショ！【おめでとう】"
			},
			rule: {
				title: "遊び方",
				thanks: "本ゲームを遊んでいただきありがとうございます。",
				ai: "【90%がAIを使って制作したゲームとなります。】",
				ctrlHead: "操作方法",
				c1: "1 横フリックで移動・縦3方向のどれかにフリックで打つ。",
				c2: "2 缶にボールが当たると制限時間に+{t}秒【コンボ数で+{T}秒まで上昇】",
				scoreHead: "スコア",
				colWhere: "当たった場所", colFore: "フォア", colBack: "バックハンド",
				wall: "壁",
				sp1: "特殊ボール（{x}コンボ未満）",
				sp2: "特殊ボール（{x}〜{y}コンボ）",
				sp3: "特殊ボール（{c}コンボ以上）",
				note: "起動時の言語は、ブラウザの言語に影響されます（未対応の言語は英語）。Language ボタンで変更できます。"
			}
		}
	};

	var LANG = TEXT[DEFAULT_LANG] ? DEFAULT_LANG : "en";
	var TX = TEXT[LANG];

	function inLangMenu(code) {
		for (var i = 0; i < LANG_MENU.length; i++) {
			if (LANG_MENU[i].code === code) return true;
		}
		return false;
	}

	var scene = new g.Scene({
		game: g.game,
		assetPaths: ["/image/*", "/audio/*"]
	});

	scene.onLoad.add(function () {
		// ---------- 乱数 ----------
		function rnd() { return g.game.random.generate(); }

		// ---------- アセット取得ヘルパー（無いファイルがあっても落ちない） ----------
		var IMG_EXTS = ["", ".png", ".PNG", ".jpg", ".JPG", ".jpeg", ".JPEG"];
		function img(id) {
			for (var i = 0; i < IMG_EXTS.length; i++) {
				try {
					var a = scene.asset.getImageById(id + IMG_EXTS[i]);
					if (a) return a;
				} catch (e) { /* 次の候補へ */ }
			}
			return null;
		}
		function aud(id) {
			try { return scene.asset.getAudioById(id); } catch (e) { return null; }
		}
		function visual(id, x, y, w, h, fallbackColor) {
			var a = img(id);
			if (a) {
				return new g.Sprite({
					scene: scene, src: a, x: x, y: y, width: w, height: h,
					srcWidth: a.width, srcHeight: a.height
				});
			}
			return new g.FilledRect({
				scene: scene, cssColor: fallbackColor || "#444444",
				x: x, y: y, width: w, height: h
			});
		}
		function spriteOnly(id, x, y, w, h) {
			var a = img(id);
			if (!a) return null;
			return new g.Sprite({
				scene: scene, src: a, x: x, y: y, width: w, height: h,
				srcWidth: a.width, srcHeight: a.height
			});
		}

		// ---------- 音声 ----------
		// volume が 1.0 を超える指定は、同じ音を2つ重ねて再生して擬似的に大きくする
		function playSound(id, volume) {
			var a = aud(id);
			if (!a) return;
			var v = (volume === undefined) ? 1.0 : volume;
			var main = Math.min(1.0, v);
			var p = a.play();
			if (p && p.changeVolume) p.changeVolume(main);
			if (v > 1.0) {
				var p2 = a.play();
				if (p2 && p2.changeVolume) p2.changeVolume(Math.min(1.0, v - 1.0));
			}
		}
		function stopSound(id) {
			var a = aud(id);
			if (a) a.stop();
		}
		function playRandomSound(ids, volume) {
			playSound(ids[Math.floor(rnd() * ids.length)], volume);
		}
		// BGMは「同時に1つだけ」鳴らす。曲が終わったらプレイ中に限り自動で流し直す
		var bgm = aud("nc504899");
		var bgmPlayer = null;
		var bgmWanted = false;
		function bgmIsPlaying() {
			if (!bgm) return false;
			var playing = false;
			try { if (typeof bgm.isPlaying === "function") playing = !!bgm.isPlaying(); } catch (e) { /* 次へ */ }
			return playing || !!bgmPlayer;
		}
		function startBgm() {
			if (!bgm) return;
			bgmWanted = true;
			if (bgmIsPlaying()) return;
			var p = bgm.play();
			bgmPlayer = p || null;
			if (p) {
				if (p.changeVolume) p.changeVolume(0.5);
				if (p.onStop) {
					p.onStop.add(function () { if (bgmPlayer === p) bgmPlayer = null; });
				}
			}
		}
		function stopBgm() {
			bgmWanted = false;
			bgmPlayer = null;
			if (bgm) bgm.stop();
		}
		scene.setInterval(function () {
			if (state === "playing" && bgmWanted && !bgmIsPlaying()) startBgm();
		}, 500);

		// ---------- 壁エリア(2324)の当たり判定マスク ----------
		var wallMask = null;
		(function buildMask() {
			try {
				var a = img(ID_WALL);
				if (!a || typeof document === "undefined") return;
				var surface = a.asSurface();
				var el = surface.getHTMLElement ? surface.getHTMLElement() : null;
				if (!el) return;
				var c = document.createElement("canvas");
				c.width = W;
				c.height = H;
				var cx = c.getContext("2d");
				cx.drawImage(el, 0, 0, W, H);
				wallMask = cx.getImageData(0, 0, W, H).data;
			} catch (e) {
				wallMask = null;
			}
			if (typeof console !== "undefined") {
				console.log("[wall area 2324] hit mask: " + (wallMask ? "enabled" : "disabled (no area limit)"));
			}
		})();
		function inHitZone(x, y) {
			if (!wallMask) return true;
			var ix = Math.floor(x);
			var iy = Math.floor(y);
			if (ix < 0 || iy < 0 || ix >= W || iy >= H) return false;
			return wallMask[(iy * W + ix) * 4 + 3] > 32;
		}
		// 中心(x, y)・半径 radius の円全体が壁エリア内に収まっているか
		function circleInHitZone(x, y, radius) {
			if (!wallMask) return true;
			if (!inHitZone(x, y)) return false;
			for (var i = 0; i < 16; i++) {
				var ang = (Math.PI * 2 * i) / 16;
				if (!inHitZone(x + Math.cos(ang) * radius, y + Math.sin(ang) * radius)) return false;
			}
			return true;
		}

		// ---------- 状態 ----------
		var state = "title"; // title / select_hand / rule / language / playing / end
		var score = 0;
		var lives = 4;
		var timeLeft = PLAY_TIME;
		var frameCount = 0;
		var handedness = "right";
		var combo = 0;
		var speedLevel = 1;
		var isFirstBall = true;
		var currentLaneIndex = 2;
		var isSwinging = false;
		var swingTimer = 0;
		var isBackhandStance = false;
		var downX = 0;
		var downY = 0;
		var overAnimY = -300;
		var overTargetY = 200;
		var hasPlayedBookSound = false;
		var endReady = false;
		var canReplay = true;
		var bonus = null;            // 今出ている特殊ボール { x, y }
		var lastRollSpawned = false; // 直前の抽選で特殊ボールが出たか
		var popups = [];
		var bestScore = 0;           // ベストスコア（このページを開いている間だけ保持）

		var ball = {
			x: 640, y: 120, drawY: 120, size: 60, scale: 0.5, speedY: 4.0 * F,
			targetLaneIndex: 2, state: "falling", startX: 640, startY: 120, curve: 0, backhand: false
		};
		var player = { width: 230, height: 230, y: 460 };

		function setScore(v) {
			score = Math.max(0, Math.round(v));
			updateHud();
		}

		// ---------- 表示物 ----------
		var fonts = {};
		function fontOf(size) {
			if (!fonts[size]) {
				fonts[size] = new g.DynamicFont({ game: g.game, fontFamily: "sans-serif", size: size });
			}
			return fonts[size];
		}
		function makeLabel(text, x, y, size, color, align, width) {
			var opt = {
				scene: scene, font: fontOf(size), text: text, fontSize: size,
				textColor: color, x: x, y: y
			};
			if (align) {
				opt.textAlign = align;
				opt.widthAutoAdjust = false;
				opt.width = width || W;
			}
			return new g.Label(opt);
		}

		// 言語を切り替えたときに文字を入れ替える対象
		var i18n = [];
		function makeLabelT(getter, x, y, size, color, align, width) {
			var l = makeLabel(getter(), x, y, size, color, align, width);
			i18n.push({ label: l, get: getter });
			return l;
		}
		function refreshTexts() {
			for (var i = 0; i < i18n.length; i++) {
				var t = i18n[i].get();
				if (i18n[i].label.text !== t) {
					i18n[i].label.text = t;
					i18n[i].label.invalidate();
				}
			}
		}
		function labelOf(text, x, y, size, color, align, width) {
			return (typeof text === "function")
				? makeLabelT(text, x, y, size, color, align, width)
				: makeLabel(text, x, y, size, color, align, width);
		}

		// コードで描くボタン（四角＋文字）
		function codeButton(cx, top, w, h, color, text, size, textColor) {
			var x = Math.round(cx - w / 2);
			var e = new g.E({ scene: scene, x: x, y: top, width: w, height: h });
			var bg = new g.FilledRect({ scene: scene, cssColor: color, x: 0, y: 0, width: w, height: h });
			e.append(bg);
			e.append(labelOf(text, 0, Math.round((h - size) / 2) - 2, size, textColor || "white", g.TextAlign.Center, w));
			return { e: e, bg: bg, rect: { x: x, y: top, width: w, height: h } };
		}
		function pickId(ids) {
			for (var i = 0; i < ids.length; i++) {
				if (img(ids[i])) return ids[i];
			}
			return ids[0];
		}
		// 縦横比を保って枠に収め、横中央 cx・上端 top に置く
		function fitImage(id, cx, top, maxW, maxH, fallbackColor) {
			var a = img(id);
			var w = maxW;
			var h = maxH;
			if (a) {
				var sc = Math.min(maxW / a.width, maxH / a.height);
				w = Math.round(a.width * sc);
				h = Math.round(a.height * sc);
			}
			var x = Math.round(cx - w / 2);
			return {
				e: visual(id, x, top, w, h, fallbackColor),
				rect: { x: x, y: top, width: w, height: h }
			};
		}
		// 黒い影つきの文字
		function shadowText(text, x, y, size, color, align, width) {
			var e = new g.E({ scene: scene });
			e.append(labelOf(text, x + 2, y + 2, size, "black", align, width));
			e.append(labelOf(text, x, y, size, color || "white", align, width));
			return e;
		}
		var captionNodes = [];
		function captionBelow(rect, text, size) {
			var e = shadowText(text, rect.x, rect.y + rect.height + 4, size, "white", g.TextAlign.Center, rect.width);
			captionNodes.push(e);
			return e;
		}
		function captionRight(rect, text, size) {
			var e = shadowText(text, rect.x + rect.width + 20, rect.y + Math.round((rect.height - size) / 2) - 2, size, "white");
			captionNodes.push(e);
			return e;
		}
		// 日本語のときは、画像にもう日本語が入っているので補足文字は出さない
		function updateCaptionVisibility() {
			for (var i = 0; i < captionNodes.length; i++) {
				if (LANG === "ja") captionNodes[i].hide(); else captionNodes[i].show();
			}
		}

		// 重ね順（下から）: 2323 背景 → 2324 壁エリア → 2325 ネットエリア
		scene.append(visual(ID_BG, 0, 0, W, H, "#111111"));
		var wallSprite = spriteOnly(ID_WALL, 0, 0, W, H);
		if (wallSprite) scene.append(wallSprite);
		var netSprite = spriteOnly(ID_NET, 0, 0, W, H);
		if (netSprite) scene.append(netSprite);

		// --- タイトル画面 ---
		var titleLayer = new g.E({ scene: scene });
		titleLayer.append(makeLabelT(function () { return TX.title; }, 0, 190, 55, "white", g.TextAlign.Center, W));
		var startBtn = fitImage("start", 640, 360, 300, 110, "#ffcc00");
		titleLayer.append(startBtn.e);
		scene.append(titleLayer);

		// --- 利き手選択・メニュー画面 ---
		var leftBtn = fitImage("red1", 400, 190, 420, 200, "#335588");
		var rightBtn = fitImage("blue1", 880, 190, 420, 200, "#883333");
		var leftBtnRect = leftBtn.rect;
		var rightBtnRect = rightBtn.rect;
		var selectLayer = new g.E({ scene: scene });
		selectLayer.append(makeLabelT(function () { return TX.chooseHand; }, 0, 110, 45, "white", g.TextAlign.Center, W));
		selectLayer.append(leftBtn.e);
		selectLayer.append(rightBtn.e);
		selectLayer.append(captionBelow(leftBtn.rect, function () { return TX.left; }, 32));
		selectLayer.append(captionBelow(rightBtn.rect, function () { return TX.right; }, 32));

		var RULE_ID = pickId(["rule2", "rule1", "rule"]);
		var ruleBtn = fitImage(RULE_ID, 400, 440, 420, 220, "#2a2a6a");
		selectLayer.append(ruleBtn.e);
		selectLayer.append(captionBelow(ruleBtn.rect, function () { return TX.howTo; }, 30));
		var LANG_BTN_H = 110;
		var langBtn = codeButton(880, ruleBtn.rect.y + Math.round((ruleBtn.rect.height - LANG_BTN_H) / 2),
			320, LANG_BTN_H, "#1f6f78", "Language", 38);
		selectLayer.append(langBtn.e);
		scene.append(selectLayer);

		// --- ルール説明画面 ---
		var ruleLayer = new g.E({ scene: scene });
		ruleLayer.append(new g.FilledRect({
			scene: scene, cssColor: "black", opacity: 0.55, x: 0, y: 0, width: W, height: H
		}));
		var ruleView = fitImage(ID_RULE, 640, 20, 1240, 590, "#2a2a6a");
		ruleLayer.append(ruleView.e);
		var BACK_ID = pickId(["modoru2", "modoru"]);
		var backBtn = fitImage(BACK_ID, 640, 630, 240, 70, "#555555");
		ruleLayer.append(backBtn.e);
		ruleLayer.append(captionRight(backBtn.rect, function () { return TX.back; }, 30));

		function fmt(str) {
			return str.replace("{t}", SPECIAL_TIME_ADD).replace("{T}", SPECIAL_TIME_ADD_HIGH)
				.replace("{c}", COMBO_TIER2).replace("{x}", COMBO_TIER1).replace("{y}", COMBO_TIER2 - 1);
		}
		function textWidth(str, size) {
			var w = 0;
			for (var i = 0; i < str.length; i++) {
				var code = str.charCodeAt(i);
				w += (code >= 0x1100) ? size : (code === 32 ? size * 0.3 : size * 0.58);
			}
			return w;
		}
		function wrapText(text, size, maxW) {
			var tokens = text.match(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]|[^\s\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+\s*/g) || [text];
			var lines = [];
			var cur = "";
			for (var i = 0; i < tokens.length; i++) {
				var test = cur + tokens[i];
				if (cur !== "" && textWidth(test.replace(/\s+$/, ""), size) > maxW) {
					lines.push(cur.replace(/\s+$/, ""));
					cur = tokens[i].replace(/^\s+/, "");
				} else {
					cur = test;
				}
			}
			if (cur !== "") lines.push(cur.replace(/\s+$/, ""));
			return lines;
		}

		var ruleTextLayer = null;
		function buildRuleText() {
			if (ruleTextLayer) ruleTextLayer.destroy();
			ruleTextLayer = new g.E({ scene: scene });
			var R = ruleView.rect;
			var pad = Math.round(Math.min(R.width, R.height) * 0.05);
			var ix = R.x + pad;
			var iy = R.y + pad;
			var iw = R.width - pad * 2;
			var ih = R.height - pad * 2;
			var RT = TX.rule;

			function layout(f) {
				var items = [];
				var y = 0;
				var tS = Math.max(10, Math.round(44 * f));
				var hS = Math.max(10, Math.round(30 * f));
				var bS = Math.max(9, Math.round(25 * f));
				function line(text, size, color, center) {
					var lines = wrapText(text, size, iw * 0.97);
					for (var i = 0; i < lines.length; i++) {
						items.push({ text: lines[i], x: 0, y: y, size: size, color: color, w: center ? iw : 0, center: center });
						y += Math.round(size * 1.3);
					}
				}
				line(RT.title, tS, "white", true);
				y += Math.round(8 * f);
				line(RT.thanks, bS, "white", true);
				line(RT.ai, bS, "#ffd700", true);
				y += Math.round(14 * f);
				line(RT.ctrlHead, hS, "#66ccff", false);
				line(RT.c1, bS, "white", false);
				line(fmt(RT.c2), bS, "white", false);
				y += Math.round(14 * f);
				line(RT.scoreHead, hS, "#66ccff", false);

				var c0 = Math.round(iw * 0.56);
				var c1 = Math.round(iw * 0.22);
				var c2 = iw - c0 - c1;
				var lh = Math.round(bS * 1.3);
				function row(label, fore, back, color) {
					var a = wrapText(label, bS, c0 * 0.95);
					var b = wrapText(fore, bS, c1 * 0.95);
					var c = wrapText(back, bS, c2 * 0.95);
					var n = Math.max(a.length, b.length, c.length);
					var k;
					for (k = 0; k < a.length; k++) items.push({ text: a[k], x: 0, y: y + k * lh, size: bS, color: color, w: 0, center: false });
					for (k = 0; k < b.length; k++) items.push({ text: b[k], x: c0, y: y + k * lh, size: bS, color: color, w: c1, center: true });
					for (k = 0; k < c.length; k++) items.push({ text: c[k], x: c0 + c1, y: y + k * lh, size: bS, color: color, w: c2, center: true });
					y += n * lh + Math.round(4 * f);
				}
				row(RT.colWhere, RT.colFore, RT.colBack, "#ffd700");
				var rows = [
					{ label: RT.wall, base: WALL_POINTS },
					{ label: fmt(RT.sp1), base: SPECIAL_BASE_POINTS * 1.0 },
					{ label: fmt(RT.sp2), base: SPECIAL_BASE_POINTS * MULT_TIER1 },
					{ label: fmt(RT.sp3), base: SPECIAL_BASE_POINTS * MULT_TIER2 }
				];
				for (var r = 0; r < rows.length; r++) {
					row(rows[r].label, String(Math.round(rows[r].base)), String(Math.round(rows[r].base * BACKHAND_MULT)), "white");
				}
				y += Math.round(8 * f);
				line(RT.note, Math.max(9, Math.round(21 * f)), "#cccccc", false);
				return { items: items, height: y };
			}

			var f = 1;
			var L = layout(f);
			while (L.height > ih && f > 0.45) {
				f *= 0.93;
				L = layout(f);
			}
			var top = iy + Math.max(0, Math.round((ih - L.height) / 2));

			if (RULE_PANEL_OPACITY > 0) {
				var half = Math.round(pad * 0.5);
				ruleTextLayer.append(new g.FilledRect({
					scene: scene, cssColor: "black", opacity: RULE_PANEL_OPACITY,
					x: R.x + half, y: R.y + half, width: R.width - half * 2, height: R.height - half * 2
				}));
			}
			for (var i = 0; i < L.items.length; i++) {
				var it = L.items[i];
				ruleTextLayer.append(makeLabel(it.text, ix + it.x, top + it.y, it.size, it.color,
					it.center ? g.TextAlign.Center : undefined, it.center ? it.w : undefined));
			}
			ruleLayer.append(ruleTextLayer);
		}
		buildRuleText();
		scene.append(ruleLayer);

		// --- 言語選択画面 ---
		var langLayer = new g.E({ scene: scene });
		langLayer.append(new g.FilledRect({
			scene: scene, cssColor: "black", opacity: 0.75, x: 0, y: 0, width: W, height: H
		}));
		langLayer.append(makeLabel("Language", 0, 50, 44, "white", g.TextAlign.Center, W));
		var langButtons = [];
		for (var li = 0; li < LANG_MENU.length; li++) {
			var col = li % 2;
			var row = Math.floor(li / 2);
			var lb = codeButton(col === 0 ? 400 : 880, 140 + row * 100, 480, 86, "#2a2a6a", LANG_MENU[li].name, 40);
			lb.code = LANG_MENU[li].code;
			langButtons.push(lb);
			langLayer.append(lb.e);
		}
		var langBackBtn = codeButton(640, 600, 240, 70, "#555555", function () { return TX.back; }, 32);
		langLayer.append(langBackBtn.e);
		scene.append(langLayer);
		function markCurrentLang() {
			for (var i = 0; i < langButtons.length; i++) {
				langButtons[i].bg.cssColor = (langButtons[i].code === LANG) ? "#2a7a3a" : "#2a2a6a";
				langButtons[i].bg.modified();
			}
		}
		function applyLanguage(code) {
			if (!TEXT[code]) return;
			LANG = code;
			TX = TEXT[code];
			refreshTexts();
			updateCaptionVisibility();
			buildRuleText();
			updateHud();
		}

		// --- ゲーム画面 ---
		var gameLayer = new g.E({ scene: scene });
		scene.append(gameLayer);

		var bonusSprite = visual("nc490164kan", 0, 0, BONUS_SIZE, BONUS_SIZE, "#ffd700");
		bonusSprite.hide();
		gameLayer.append(bonusSprite);

		function pl(id, fallback) { return visual(id, 0, player.y, player.width, player.height, fallback); }
		var playerSprites = {
			right_fore: pl("hand1", "#ffffff"),
			right_fore_swing: pl("hand2", "#ff5555"),
			right_back: pl("lback", "#55ff55"),
			right_back_swing: pl("lback2", "#55ff55"),
			left_fore: pl("left", "#ffffff"),
			left_fore_swing: pl("left2", "#ff5555"),
			left_back: pl("lback3", "#55ff55"),
			left_back_swing: pl("lback4", "#55ff55")
		};
		var playerKeys = Object.keys(playerSprites);
		playerKeys.forEach(function (k) {
			playerSprites[k].hide();
			gameLayer.append(playerSprites[k]);
		});

		var ballSprite = visual("ball", 0, 0, 30, 30, "#ffffff");
		gameLayer.append(ballSprite);

		var hudTime = makeLabel("", 20, 12, 22, "white");
		var hudScore = makeLabel("", 240, 12, 22, "white");
		var hudCombo = makeLabel("", 420, 12, 22, "white");
		var hudSpeed = makeLabel("", 600, 12, 22, "white");
		var hudLives = makeLabel("", 820, 12, 22, "white");
		var hudStance = makeLabel("", 980, 12, 22, "white");
		[hudTime, hudScore, hudCombo, hudSpeed, hudLives, hudStance].forEach(function (l) { gameLayer.append(l); });

		var hudBonus = makeLabel("", 20, 46, 26, "#ffd700");
		hudBonus.hide();
		gameLayer.append(hudBonus);
		var hudBonusFrames = 0;
		var HUD_BONUS_SHOW_FRAMES = 2 * 30;

		function setText(label, text) {
			if (label.text !== text) {
				label.text = text;
				label.invalidate();
			}
		}
		function updateHud() {
			setText(hudTime, TX.timeLbl + timeLeft + TX.timeUnit);
			setText(hudScore, TX.scoreLbl + score);
			setText(hudCombo, TX.comboLbl + combo);
			setText(hudSpeed, TX.speedLbl + speedLevel);
			setText(hudLives, TX.livesLbl + lives);
			setText(hudStance, TX.stanceLbl + (isBackhandStance ? TX.backhand : TX.forehand));
		}

		// --- 終了画面（終了のたびに作り直す） ---
		var endLayer = null;
		var endScoreLabel = null;
		var endButtons = null;
		var rankSprite = null;
		var endCaption = null;
		var endBest = null;
		var replayRect = null;
		var quitRect = null;

		function getRankId(s) {
			if (s <= 999) return "n";
			if (s <= 1999) return "kr";
			if (s <= 3499) return "kkk";
			if (s <= 4999) return "i";
			if (s <= 6699) return img("s") ? "s" : "n";
			if (s <= 10999) return "f";
			if (s <= 29999) return "ff";
			return "k";
		}

		function buildEndScreen() {
			if (endLayer) endLayer.destroy();
			endLayer = new g.E({ scene: scene });
			scene.append(endLayer);

			rankSprite = visual(getRankId(score), (W - 600) / 2, -300, 600, 180, "#444444");
			endLayer.append(rankSprite);

			var textY = overTargetY + 180 + 40;
			var scoreColor = (score >= RESULT_RED_SCORE) ? "red" : "black";
			endScoreLabel = makeLabel(TX.scoreLbl + score, 0, overTargetY + RESULT_SCORE_OFFSET_Y, 36, scoreColor, g.TextAlign.Center, W);
			endScoreLabel.hide();
			endLayer.append(endScoreLabel);

			endCaption = null;
			var rankText = TX.rank && TX.rank[getRankId(score)];
			if (rankText && LANG !== "ja") {
				endCaption = shadowText(rankText, 0, overTargetY + 180 + 6, 34, "#ffd700", g.TextAlign.Center, W);
				endCaption.hide();
				endLayer.append(endCaption);
			}

			endBest = shadowText(TX.bestLbl + bestScore, 0, 140, 30, "white", g.TextAlign.Center, W);
			endBest.hide();
			endLayer.append(endBest);

			endButtons = new g.E({ scene: scene });
			endButtons.hide();
			endLayer.append(endButtons);

			function button(rect, color, text) {
				endButtons.append(new g.FilledRect({
					scene: scene, cssColor: color,
					x: rect.x, y: rect.y, width: rect.width, height: rect.height
				}));
				endButtons.append(makeLabel(text, rect.x, rect.y + 14, 24, "white", g.TextAlign.Center, rect.width));
			}
			var by = textY + 30;
			if (canReplay) {
				replayRect = { x: 410, y: by, width: 200, height: 55 };
				quitRect = { x: 670, y: by, width: 200, height: 55 };
				button(replayRect, "#226622", TX.replay);
				button(quitRect, "#662222", TX.quit);
			} else {
				replayRect = null;
				var pairLeft = 410;
				var pairRight = 670 + 200;
				var qw = 200;
				quitRect = { x: Math.round((pairLeft + pairRight) / 2 - qw / 2), y: by, width: qw, height: 55 };
				button(quitRect, "#662222", TX.quit);
			}
		}

		// ---------- 画面切り替え ----------
		function showScreen(name) {
			state = name;
			if (name !== "end") stopSound("nc43463");
			titleLayer.hide();
			selectLayer.hide();
			ruleLayer.hide();
			langLayer.hide();
			gameLayer.hide();
			if (endLayer) endLayer.hide();
			if (name === "title") titleLayer.show();
			else if (name === "select_hand") selectLayer.show();
			else if (name === "rule") ruleLayer.show();
			else if (name === "language") { markCurrentLang(); langLayer.show(); }
			else if (name === "playing") gameLayer.show();
			else if (name === "end" && endLayer) endLayer.show();
		}

		// ---------- ゲームロジック ----------
		function updateSpeedLevel() {
			var lv, sp;
			if (combo <= 5) { lv = 1; sp = 4.0; }
			else if (combo <= 10) { lv = 2; sp = 5.0; }
			else if (combo <= 15) { lv = 3; sp = 6.0; }
			else if (combo <= 20) { lv = 4; sp = 7.0; }
			else if (combo <= 26) { lv = 5; sp = 8.0; }
			else { lv = 6; sp = 9.0; }
			speedLevel = lv;
			ball.speedY = sp * F;
		}

		function easeOut(t) { return 1 - (1 - t) * (1 - t); }

		function resetBall() {
			var lane;
			if (isFirstBall) {
				lane = currentLaneIndex;
				isFirstBall = false;
			} else {
				lane = Math.floor(rnd() * lanes.length);
			}
			ball.x = lanes[lane] + (handedness === "right" ? 35 : -35);
			ball.y = 120;
			ball.drawY = 120;
			ball.scale = 0.5;
			ball.curve = 0;
			ball.state = "falling";
			rollSpecial();
		}

		function pickBounceLane() {
			var cands = [];
			var weights = [];
			var total = 0;
			for (var d = -BOUNCE_REACH; d <= BOUNCE_REACH; d++) {
				var li2 = currentLaneIndex + d;
				if (li2 < 0 || li2 >= lanes.length) continue;
				var w = (d === 0) ? BOUNCE_CENTER_WEIGHT : 1;
				cands.push(li2);
				weights.push(w);
				total += w;
			}
			var r = rnd() * total;
			for (var i = 0; i < cands.length; i++) {
				r -= weights[i];
				if (r <= 0) return cands[i];
			}
			return cands[cands.length - 1];
		}

		function startGame() {
			score = 0;
			lives = 4;
			timeLeft = PLAY_TIME;
			frameCount = 0;
			combo = 0;
			speedLevel = 1;
			ball.speedY = 4.0 * F;
			isFirstBall = true;
			isBackhandStance = false;
			isSwinging = false;
			bonus = null;
			lastRollSpawned = false;
			bonusSprite.hide();
			hudBonus.hide();
			hudBonusFrames = 0;
			resetBall();
			updateHud();
			showScreen("playing");
			startBgm();
		}

		function checkGameEnd() {
			if (state === "end") return;
			stopBgm();
			bonus = null;
			canReplay = (score < REPLAY_SCORE_LIMIT);
			if (lives > 0) {
				playSound("aaav", 1.0);
			} else {
				playSound("nc43463", 0.45);
			}
			overAnimY = -300;
			hasPlayedBookSound = false;
			endReady = false;
			if (score > bestScore) bestScore = score;
			buildEndScreen();
			showScreen("end");
		}

		// ---------- 特殊ボール（nc490164kan.png） ----------
		function comboMultiplier() {
			if (combo >= COMBO_TIER2) return MULT_TIER2;
			if (combo >= COMBO_TIER1) return MULT_TIER1;
			return 1.0;
		}

		function rollSpecial() {
			bonus = null;
			var chance;
			if (lastRollSpawned) chance = SPECIAL_CHANCE_CONSECUTIVE;
			else chance = (combo >= COMBO_TIER1) ? SPECIAL_CHANCE_HIGH : SPECIAL_CHANCE;

			var spawned = false;
			if (rnd() < chance) {
				for (var i = 0; i < 60 && !spawned; i++) {
					var li3 = currentLaneIndex + Math.floor(rnd() * 3) - 1;
					if (li3 < 0 || li3 >= lanes.length) continue;
					var y = BONUS_Y_MIN + rnd() * (BONUS_Y_MAX - BONUS_Y_MIN);
					if (circleInHitZone(lanes[li3], y, BONUS_SIZE / 2 + BONUS_EDGE_MARGIN)) {
						bonus = { x: lanes[li3], y: y };
						spawned = true;
					}
				}
			}
			lastRollSpawned = spawned;
		}

		function addPopup(text, x, y, color) {
			var shadow = makeLabel(text, x - 300 + 2, y + 2, 32, "black", g.TextAlign.Center, 600);
			var front = makeLabel(text, x - 300, y, 32, color || "white", g.TextAlign.Center, 600);
			gameLayer.append(shadow);
			gameLayer.append(front);
			popups.push({ labels: [shadow, front], life: HIT_POPUP_FRAMES });
		}

		function checkSpecialHit() {
			if (!bonus) return;
			var r = (ball.size * ball.scale) / 2;
			var dx = ball.x - bonus.x;
			var dy = ball.drawY - bonus.y;
			var hit = r + BONUS_SIZE * 0.5;
			if (dx * dx + dy * dy > hit * hit) return;

			var mult = comboMultiplier();
			var backMult = ball.backhand ? BACKHAND_MULT : 1.0;
			var pts = Math.round(SPECIAL_BASE_POINTS * mult * backMult);
			var add = (combo >= COMBO_TIER2) ? SPECIAL_TIME_ADD_HIGH : SPECIAL_TIME_ADD;
			timeLeft += add;
			setScore(score + pts);
			combo++;
			updateSpeedLevel();
			updateHud();
			addPopup("+" + pts, bonus.x, bonus.y - 20, "#ffd700");
			playSound("kan", 1.0);
			hudBonus.text = TX.plusSec(add);
			hudBonus.invalidate();
			hudBonus.show();
			hudBonusFrames = HUD_BONUS_SHOW_FRAMES;
			bonus = null;
		}

		function updateBonus() {
			if (bonus) {
				bonusSprite.x = bonus.x - BONUS_SIZE / 2;
				bonusSprite.y = bonus.y - BONUS_SIZE / 2;
				bonusSprite.show();
				bonusSprite.modified();
			} else {
				bonusSprite.hide();
			}
			if (hudBonusFrames > 0) {
				hudBonusFrames--;
				if (hudBonusFrames <= 0) hudBonus.hide();
			}
			for (var i = popups.length - 1; i >= 0; i--) {
				popups[i].life--;
				for (var j = 0; j < popups[i].labels.length; j++) {
					popups[i].labels[j].y -= 0.8 * F;
					popups[i].labels[j].modified();
				}
				if (popups[i].life <= 0) {
					for (var k = 0; k < popups[i].labels.length; k++) popups[i].labels[k].destroy();
					popups.splice(i, 1);
				}
			}
		}

		// ---------- 入力 ----------
		function inRect(x, y, r) {
			return !!r && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
		}

		function handleTap(x, y) {
			if (state === "title") {
				if (inRect(x, y, startBtn.rect)) {
					playSound("44", 1.4);
					showScreen("select_hand");
				}
			} else if (state === "select_hand") {
				if (inRect(x, y, leftBtnRect)) {
					playSound("51", 1.4);
					handedness = "left";
					startGame();
				} else if (inRect(x, y, rightBtnRect)) {
					playSound("51", 1.4);
					handedness = "right";
					startGame();
				} else if (inRect(x, y, ruleBtn.rect)) {
					playSound("click", 1.0);
					showScreen("rule");
				} else if (inRect(x, y, langBtn.rect)) {
					playSound("click", 1.0);
					showScreen("language");
				}
			} else if (state === "rule") {
				if (inRect(x, y, backBtn.rect)) {
					playSound("click", 1.0);
					showScreen("select_hand");
				}
			} else if (state === "language") {
				if (inRect(x, y, langBackBtn.rect)) {
					playSound("click", 1.0);
					showScreen("select_hand");
					return;
				}
				for (var i = 0; i < langButtons.length; i++) {
					if (inRect(x, y, langButtons[i].rect)) {
						playSound("click", 1.0);
						applyLanguage(langButtons[i].code);
						showScreen("select_hand");
						return;
					}
				}
			} else if (state === "end") {
				if (!endReady) return;
				if (inRect(x, y, replayRect)) {
					playSound("51", 1.4);
					stopSound("nc43463");
					showScreen("select_hand");
				} else if (inRect(x, y, quitRect)) {
					playSound("51", 1.4);
					showScreen("title");
				}
			}
		}

		// 打撃スワイプ: course = -1(左) / 0(中) / +1(右)
		function tryHit(course) {
			if (ball.state !== "falling" || ball.y < 440 || ball.y > 620) return;
			var px = lanes[currentLaneIndex];
			if (Math.abs(px - ball.x) >= 240 || !inHitZone(ball.x, ball.y)) return;

			ball.state = "returning";
			ball.startX = ball.x;
			ball.startY = ball.y;
			var target = currentLaneIndex + course;
			if (target < 0) target = 0;
			if (target > lanes.length - 1) target = lanes.length - 1;
			ball.targetLaneIndex = target;
			ball.curve = course * CURVE_X;
			ball.backhand = isBackhandStance;
			playRandomSound(["daon", "daon0"], 0.7);
			isSwinging = true;
			swingTimer = 8;
			updateHud();
		}

		function moveLane(dir, steps) {
			var n = currentLaneIndex + dir * steps;
			if (n < 0) n = 0;
			if (n > lanes.length - 1) n = lanes.length - 1;
			currentLaneIndex = n;
		}

		scene.onPointDownCapture.add(function (ev) {
			downX = ev.point.x;
			downY = ev.point.y;
		});
		scene.onPointUpCapture.add(function (ev) {
			var dx = ev.startDelta.x;
			var dy = ev.startDelta.y;
			var adx = Math.abs(dx);
			var ady = Math.abs(dy);

			if (state === "playing") {
				if (ady >= HIT_MIN && ady > adx * 0.5) {
					var course = dx < -COURSE_DX ? -1 : (dx > COURSE_DX ? 1 : 0);
					tryHit(course);
				} else if (adx >= MOVE_MIN) {
					moveLane(dx > 0 ? 1 : -1, adx >= MOVE_FAR ? 2 : 1);
				}
			} else if (adx < TAP_MAX && ady < TAP_MAX) {
				handleTap(downX, downY);
			}
		});

		// ---------- メインループ ----------
		function updatePlayerAndBall() {
			var key = handedness + (isBackhandStance ? "_back" : "_fore") + (isSwinging ? "_swing" : "");
			var px = lanes[currentLaneIndex] - player.width / 2 + (handedness === "right" ? 15 : 0);
			playerKeys.forEach(function (k) {
				var s = playerSprites[k];
				if (k === key) {
					s.x = px;
					s.show();
					s.modified();
				} else {
					s.hide();
				}
			});
			var bs = ball.size * ball.scale;
			ballSprite.x = ball.x - bs / 2;
			ballSprite.y = ball.drawY - bs / 2;
			ballSprite.width = bs;
			ballSprite.height = bs;
			ballSprite.modified();
		}

		scene.onUpdate.add(function () {
			if (state === "playing") {
				frameCount++;
				if (frameCount >= g.game.fps) {
					frameCount = 0;
					timeLeft--;
					if (timeLeft <= 0) {
						timeLeft = 0;
						updateHud();
						checkGameEnd();
						return;
					}
					updateHud();
				}

				if (isSwinging) {
					swingTimer--;
					if (swingTimer <= 0) isSwinging = false;
				}

				var t;
				if (ball.state === "falling") {
					ball.y += ball.speedY;
					ball.drawY = ball.y;
					ball.scale += 0.004 * F;
					if (ball.scale > 1.0) ball.scale = 1.0;

					// 構えは自動: 近づくボールが利き手と反対側なら バックハンド
					var back = false;
					if (ball.y >= 300) {
						var ppx = lanes[currentLaneIndex];
						back = (handedness === "right") ? (ball.x < ppx - 25) : (ball.x > ppx + 25);
					}
					if (back !== isBackhandStance) {
						isBackhandStance = back;
						updateHud();
					}

					if (ball.y > 720) {
						lives--;
						combo = 0;
						updateSpeedLevel();
						updateHud();
						if (lives <= 0) {
							checkGameEnd();
							return;
						}
						resetBall();
					}
				} else if (ball.state === "returning") {
					ball.y -= ball.speedY * 1.5;
					if (ball.y < 120) ball.y = 120;
					ball.scale -= 0.05 * F;
					if (ball.scale < 0.5) ball.scale = 0.5;
					t = Math.min(1, (ball.startY - ball.y) / Math.max(1, ball.startY - 120));
					var bx = ball.startX + (lanes[ball.targetLaneIndex] - ball.startX) * easeOut(t);
					bx += ball.curve * 4 * t * (1 - t);
					ball.x = Math.max(0, Math.min(W, bx));
					ball.drawY = ball.y - ARC_HEIGHT * 4 * t * (1 - t);
					checkSpecialHit();
					if (ball.y <= 120) {
						ball.y = 120;
						ball.drawY = 120;
						ball.x = lanes[ball.targetLaneIndex];
						ball.curve = 0;
						bonus = null;
						var wallPts = Math.round(WALL_POINTS * (ball.backhand ? BACKHAND_MULT : 1.0));
						setScore(score + wallPts);
						addPopup("+" + wallPts, ball.x, 125, "white");
						combo++;
						updateSpeedLevel();
						updateHud();
						ball.startX = ball.x;
						ball.targetLaneIndex = pickBounceLane();
						ball.state = "bouncingBack";
						playRandomSound(["tennis1", "tennis2"], 0.6);
					}
				} else if (ball.state === "bouncingBack") {
					ball.y += ball.speedY;
					if (ball.y > 460) ball.y = 460;
					ball.scale += 0.05 * F;
					if (ball.scale > 1.0) ball.scale = 1.0;
					t = Math.min(1, (ball.y - 120) / (460 - 120));
					ball.x = ball.startX + (lanes[ball.targetLaneIndex] - ball.startX) * easeOut(t);
					ball.drawY = ball.y - ARC_HEIGHT * 0.5 * 4 * t * (1 - t);
					if (ball.y >= 460) {
						ball.y = 460;
						ball.drawY = 460;
						ball.x = lanes[ball.targetLaneIndex];
						ball.state = "falling";
						rollSpecial();
					}
				}

				updateBonus();
				updatePlayerAndBall();

			} else if (state === "end") {
				if (overAnimY < overTargetY) {
					overAnimY += 25 * F;
					if (overAnimY >= overTargetY) {
						overAnimY = overTargetY;
						if (!hasPlayedBookSound) {
							playSound("book", 1.0);
							hasPlayedBookSound = true;
						}
						endScoreLabel.show();
						if (endCaption) endCaption.show();
						if (endBest) endBest.show();
						endButtons.show();
						endReady = true;
					}
					rankSprite.y = overAnimY;
					rankSprite.modified();
				}
			}
		});

		// ---------- 起動時の言語: ブラウザの言語に合わせる ----------
		try {
			var nav = (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "";
			var nl = nav.toLowerCase().slice(0, 2);
			if (nl === "ja" || inLangMenu(nl)) applyLanguage(nl);
		} catch (eLang) { /* 英語のまま */ }

		updateCaptionVisibility();
		showScreen("title");
	});

	g.game.pushScene(scene);
}

module.exports = main;
