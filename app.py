from bottle import Bottle, run, template, static_file, request, redirect, response
import pymysql.cursors
import bcrypt
from beaker.middleware import SessionMiddleware
from bottle import abort
import datetime
import json
from decimal import Decimal

# Fungsi untuk koneksi ke database
def get_db_connection():
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='',  # Isi dengan password MySQL Anda jika ada
        db='quiz_app',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )
    return connection

# Konfigurasi aplikasi Bottle
app = Bottle()

# Konfigurasi sesi dengan Beaker
session_opts = {
    'session.type': 'cookie',
    'session.cookie_expires': 3600,  # 1 jam
    'session.validate_key': True,
    'session.auto': True,
}

# Jangan timpa app; buat wrapped_app
wrapped_app = SessionMiddleware(app, session_opts)

# Route root yang mengarahkan pengguna berdasarkan status sesi
@app.route('/')
def index():
    session = request.environ.get('beaker.session')
    if 'user_id' in session:
        return redirect('/dashboard')
    else:
        return redirect('/login')

# Route untuk registrasi
@app.route('/register', method=['GET', 'POST'])
def register():
    session = request.environ.get('beaker.session')
    if request.method == 'POST':
        username = request.forms.get('username')
        email = request.forms.get('email')
        password = request.forms.get('password')
        confirm_password = request.forms.get('confirm_password')

        # Validasi sederhana
        if password != confirm_password:
            return template('auth/register', error='Password dan konfirmasi password tidak cocok.')

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)"
                cursor.execute(sql, (username, email, hashed_password.decode('utf-8')))
            connection.commit()
            return redirect('/login')
        except pymysql.err.IntegrityError:
            # Tangani jika username atau email sudah digunakan
            return template('auth/register', error='Username atau email sudah digunakan.')
        finally:
            connection.close()
    else:
        return template('auth/register', error=None)

# Route untuk login
# Route for login
@app.route('/login', method=['GET', 'POST'])
def login():
    session = request.environ.get('beaker.session')
    if request.method == 'POST':
        username = request.forms.get('username')
        password = request.forms.get('password')

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = "SELECT * FROM users WHERE username = %s"
                cursor.execute(sql, (username,))
                user = cursor.fetchone()
                if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                    session['user_id'] = user['user_id']
                    session['role'] = user['role']
                    session['username'] = user['username']  # Add this line
                    session.save()
                    return redirect('/dashboard')
                else:
                    return template('auth/login', error='Username atau password salah.')
        finally:
            connection.close()
    else:
        return template('auth/login', error=None)

def is_admin(session):
    return session.get('role') == 'admin'

# Route for dashboard
@app.route('/dashboard')
def dashboard():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        return redirect('/login')
    role = session.get('role')
    if role == 'admin':
        return redirect('/admin/dashboard')  # Redirect to admin dashboard
    else:
        return redirect('/user/dashboard')   # Redirect to user dashboard

# Route for admin dashboard
@app.route('/admin/dashboard')
def admin_dashboard():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or session.get('role') != 'admin':
        return redirect('/login')
    return template('admin/dashboard')

# Route for user dashboard
@app.route('/user/dashboard')
def user_dashboard():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        return redirect('/login')
    return template('user/dashboard', session=session)


# Route untuk logout
@app.route('/logout')
def logout():
    session = request.environ.get('beaker.session')
    session.delete()
    return redirect('/login')

# Route untuk halaman manajemen pengguna
@app.route('/admin/users')
def admin_manage_users():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')

    return template('admin/manage_users')

# --- Manajemen Pengguna ---
# API untuk mendapatkan daftar pengguna
@app.route('/api/admin/users')
def api_get_users():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT user_id, username, email, role, created_at FROM users"
            cursor.execute(sql)
            users = cursor.fetchall()
        
        # Konversi 'created_at' ke string
        for user in users:
            if isinstance(user['created_at'], datetime.datetime):
                user['created_at'] = user['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        return {'users': users}
    except Exception as e:
        # Tambahkan logging atau print untuk debugging
        print(f"Error in api_get_users: {e}")
        abort(500, "Internal Server Error")
    finally:
        connection.close()


# API untuk menambah pengguna baru
@app.route('/api/admin/users', method='POST')
def api_add_user():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    username = request.forms.get('username')
    email = request.forms.get('email')
    password = request.forms.get('password')
    role = request.forms.get('role')

    if not username or not email or not role:
        abort(400, "Missing required fields.")

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (username, email, hashed_password, role))
        connection.commit()
        return {'status': 'success'}
    except pymysql.err.IntegrityError:
        response.status = 400
        return {'status': 'error', 'message': 'Username atau email sudah digunakan.'}
    except Exception as e:
        print(f"Error in api_add_user: {e}")
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()

# API untuk mengupdate data pengguna
@app.route('/api/admin/users/<user_id:int>', method='PUT')
def api_update_user(user_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    username = request.forms.get('username')
    email = request.forms.get('email')
    role = request.forms.get('role')
    password = request.forms.get('password')  # Optional

    if not username or not email or not role:
        abort(400, "Missing required fields.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            if password:
                hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                sql = "UPDATE users SET username=%s, email=%s, role=%s, password_hash=%s WHERE user_id=%s"
                cursor.execute(sql, (username, email, role, hashed_password, user_id))
            else:
                sql = "UPDATE users SET username=%s, email=%s, role=%s WHERE user_id=%s"
                cursor.execute(sql, (username, email, role, user_id))
        connection.commit()
        return {'status': 'success'}
    except pymysql.err.IntegrityError:
        response.status = 400
        return {'status': 'error', 'message': 'Username atau email sudah digunakan.'}
    except Exception as e:
        print(f"Error in api_update_user: {e}")
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()

# API untuk menghapus pengguna
@app.route('/api/admin/users/<user_id:int>', method='DELETE')
def api_delete_user(user_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "DELETE FROM users WHERE user_id=%s"
            cursor.execute(sql, (user_id,))
        connection.commit()
        return {'status': 'success'}
    except Exception as e:
        print(f"Error in api_delete_user: {e}")
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()
# --- Manajemen Pengguna ---

# --- Manajemen Quiz dan Pertanyaan ---

# Route untuk halaman manajemen kuis dan pertanyaan
@app.route('/admin/quiz-questions')
def admin_manage_quiz_questions():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')
    return template('admin/manage_quiz_questions')

# API untuk mendapatkan daftar kuis
@app.route('/api/admin/quizzes')
def api_get_quizzes():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT quiz_id, title, description FROM quizzes"
            cursor.execute(sql)
            quizzes = cursor.fetchall()
        return {'quizzes': quizzes}
    finally:
        connection.close()

# API untuk menambah kuis baru
@app.route('/api/admin/quizzes', method='POST')
def api_add_quiz():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    title = request.forms.get('title')
    description = request.forms.get('description')
    created_by = session.get('user_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO quizzes (title, description, created_by) VALUES (%s, %s, %s)"
            cursor.execute(sql, (title, description, created_by))
        connection.commit()
        return {'status': 'success'}
    finally:
        connection.close()

# API untuk mengupdate kuis
@app.route('/api/admin/quizzes/<quiz_id:int>', method='PUT')
def api_update_quiz(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    title = request.forms.get('title')
    description = request.forms.get('description')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "UPDATE quizzes SET title=%s, description=%s WHERE quiz_id=%s"
            cursor.execute(sql, (title, description, quiz_id))
        connection.commit()
        return {'status': 'success'}
    finally:
        connection.close()

# API untuk menghapus kuis
@app.route('/api/admin/quizzes/<quiz_id:int>', method='DELETE')
def api_delete_quiz(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Penghapusan akan otomatis karena ON DELETE CASCADE di database
            sql = "DELETE FROM quizzes WHERE quiz_id = %s"
            cursor.execute(sql, (quiz_id,))
        connection.commit()
        return {'status': 'success'}
    except Exception as e:
        print(f"Error deleting quiz: {e}")
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()

# API untuk mendapatkan daftar pertanyaan berdasarkan kuis
@app.route('/api/admin/questions/<quiz_id:int>')
def api_get_questions(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT q.question_id, q.question_text, q.question_type,
                   GROUP_CONCAT(o.option_id SEPARATOR ',') AS option_ids,
                   GROUP_CONCAT(o.option_text SEPARATOR '|') AS option_texts,
                   GROUP_CONCAT(o.is_correct SEPARATOR ',') AS is_corrects
            FROM questions q
            LEFT JOIN options o ON q.question_id = o.question_id
            WHERE q.quiz_id = %s
            GROUP BY q.question_id
            """
            cursor.execute(sql, (quiz_id,))
            questions = cursor.fetchall()
        return {'questions': questions}
    finally:
        connection.close()

# API untuk menambah pertanyaan baru
@app.route('/api/admin/questions', method='POST')
def api_add_question():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    quiz_id = request.forms.get('quiz_id')
    question_text = request.forms.get('question_text')
    question_type = request.forms.get('question_type')
    options = request.forms.getall('options')  # List of option texts
    is_correct_list = request.forms.getall('is_correct')  # List of indices of correct options

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO questions (quiz_id, question_text, question_type) VALUES (%s, %s, %s)"
            cursor.execute(sql, (quiz_id, question_text, question_type))
            question_id = cursor.lastrowid
            if question_type == 'multiple_choice':
                for idx, option_text in enumerate(options):
                    is_correct = '1' if str(idx) in is_correct_list else '0'
                    sql = "INSERT INTO options (question_id, option_text, is_correct) VALUES (%s, %s, %s)"
                    cursor.execute(sql, (question_id, option_text, is_correct))
        connection.commit()
        return {'status': 'success'}
    finally:
        connection.close()

# API untuk mengupdate pertanyaan
@app.route('/api/admin/questions/<question_id:int>', method='PUT')
def api_update_question(question_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    question_text = request.forms.get('question_text')
    question_type = request.forms.get('question_type')
    options = request.forms.getall('options')  # List of option texts
    is_correct_list = request.forms.getall('is_correct')  # List of indices of correct options

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Update pertanyaan
            sql = "UPDATE questions SET question_text=%s, question_type=%s WHERE question_id=%s"
            cursor.execute(sql, (question_text, question_type, question_id))

            # Hapus opsi lama jika tipe pertanyaan adalah pilihan ganda
            if question_type == 'multiple_choice':
                sql = "DELETE FROM options WHERE question_id=%s"
                cursor.execute(sql, (question_id,))
                for idx, option_text in enumerate(options):
                    is_correct = '1' if str(idx) in is_correct_list else '0'
                    sql = "INSERT INTO options (question_id, option_text, is_correct) VALUES (%s, %s, %s)"
                    cursor.execute(sql, (question_id, option_text, is_correct))
            else:
                # Hapus opsi jika tipe pertanyaan berubah menjadi essay
                sql = "DELETE FROM options WHERE question_id=%s"
                cursor.execute(sql, (question_id,))
        connection.commit()
        return {'status': 'success'}
    finally:
        connection.close()

# API untuk menghapus pertanyaan
@app.route('/api/admin/questions/<question_id:int>', method='DELETE')
def api_delete_question(question_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Penghapusan akan otomatis karena ON DELETE CASCADE di database
            sql = "DELETE FROM questions WHERE question_id = %s"
            cursor.execute(sql, (question_id,))
        connection.commit()
        return {'status': 'success'}
    finally:
        connection.close()

# API untuk mendapatkan jawaban pengguna
@app.route('/api/admin/answers/<quiz_id:int>')
def api_get_answers(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT a.answer_id, a.user_id, u.username, q.question_id, q.question_text,
                   o.option_id, o.option_text
            FROM answers a
            JOIN users u ON a.user_id = u.user_id
            JOIN questions q ON a.question_id = q.question_id
            JOIN answer_options ao ON a.answer_id = ao.answer_id
            JOIN options o ON ao.option_id = o.option_id
            WHERE a.quiz_id = %s
            """
            cursor.execute(sql, (quiz_id,))
            answers = cursor.fetchall()
        return {'answers': answers}
    finally:
        connection.close()
# --- Manajemen Quiz dan Pertanyaan ---


# --- Review Jawaban Essay ---
# Route untuk halaman review essay
# Route untuk mereview jawaban essay
@app.route('/admin/review-essays')
def admin_review_essays():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')
    return template('admin/review_essays')

# API untuk mendapatkan jawaban essay yang perlu direview
@app.route('/api/admin/essay-reviews')
def api_admin_get_essay_reviews():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT 
                a.answer_id, 
                u.username, 
                q.title AS quiz_title, 
                qs.question_text, 
                a.answer_text
            FROM answers a
            JOIN users u ON a.user_id = u.user_id
            JOIN quizzes q ON a.quiz_id = q.quiz_id
            JOIN questions qs ON a.question_id = qs.question_id
            WHERE qs.question_type = 'essay' 
              AND a.answer_id NOT IN (SELECT answer_id FROM essay_reviews)
            """
            cursor.execute(sql)
            essays = cursor.fetchall()
            print(f"Fetched essays for review: {essays}")  # Debugging
        return {'essays': essays}
    except Exception as e:
        print(f"Error in api_admin_get_essay_reviews: {e}")
        import traceback
        traceback.print_exc()
        abort(500, "Internal Server Error")
    finally:
        connection.close()


# API untuk menyimpan review essay
@app.route('/api/admin/review-essay', method='POST')
def api_admin_review_essay():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    reviewed_by = session.get('user_id')
    answer_id = request.forms.get('answer_id')
    score = request.forms.get('score')
    feedback = request.forms.get('feedback')

    if not answer_id or not score:
        abort(400, "Missing required fields.")

    # Validasi input
    try:
        answer_id = int(answer_id)
        score = float(score)
        if score < 0 or score > 100:
            abort(400, "Score must be between 0 and 100.")
    except ValueError:
        abort(400, "Invalid input for answer_id or score.")

    # Normalize essay score to be between 0 and 1
    normalized_essay_score = (score / 100) * 1  # Mengasumsikan setiap pertanyaan essay bernilai 1 poin

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Simpan review ke tabel essay_reviews
            sql = """
            INSERT INTO essay_reviews (answer_id, reviewed_by, score, feedback)
            VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (answer_id, reviewed_by, normalized_essay_score, feedback))

            # Update skor di tabel history berdasarkan answer_id
            sql = """
            SELECT quiz_id, user_id, history_id FROM answers WHERE answer_id = %s
            """
            cursor.execute(sql, (answer_id,))
            answer = cursor.fetchone()
            if not answer:
                abort(404, "Answer not found.")

            quiz_id = answer['quiz_id']
            user_id = answer['user_id']
            history_id = answer['history_id']

            # Dapatkan total pertanyaan
            sql = """
            SELECT COUNT(*) AS total_questions FROM questions WHERE quiz_id = %s
            """
            cursor.execute(sql, (quiz_id,))
            result = cursor.fetchone()
            total_questions = result['total_questions']

            # Hitung jumlah jawaban multiple choice yang benar
            sql = """
            SELECT COUNT(*) AS correct_mc_answers
            FROM (
                SELECT a.answer_id
                FROM answers a
                JOIN questions q ON a.question_id = q.question_id
                LEFT JOIN (
                    SELECT ao.answer_id, GROUP_CONCAT(ao.option_id ORDER BY ao.option_id) AS selected_option_ids
                    FROM answer_options ao
                    GROUP BY ao.answer_id
                ) AS uao ON a.answer_id = uao.answer_id
                LEFT JOIN (
                    SELECT o.question_id, GROUP_CONCAT(o.option_id ORDER BY o.option_id) AS correct_option_ids
                    FROM options o
                    WHERE o.is_correct = 1
                    GROUP BY o.question_id
                ) AS co ON a.question_id = co.question_id
                WHERE a.history_id = %s AND q.question_type = 'multiple_choice'
                AND uao.selected_option_ids = co.correct_option_ids
            ) AS correct_answers
            """
            cursor.execute(sql, (history_id,))
            result = cursor.fetchone()
            correct_mc_answers = result['correct_mc_answers'] if result else 0

            # Hitung total skor essay
            sql = """
            SELECT SUM(er.score) AS total_essay_score
            FROM answers a
            JOIN essay_reviews er ON a.answer_id = er.answer_id
            WHERE a.history_id = %s
            """
            cursor.execute(sql, (history_id,))
            result = cursor.fetchone()
            total_essay_score = float(result['total_essay_score']) if result['total_essay_score'] else 0.0

            # Hitung total poin yang diperoleh
            total_points_earned = correct_mc_answers + total_essay_score
            total_possible_points = total_questions  # Mengasumsikan setiap pertanyaan bernilai 1 poin

            # Hitung skor baru sebagai persentase
            new_score = (total_points_earned / total_possible_points) * 100 if total_possible_points > 0 else 0

            # Update skor di tabel history
            sql = """
            UPDATE history SET score = %s WHERE history_id = %s
            """
            cursor.execute(sql, (new_score, history_id))

        connection.commit()
        return {'status': 'success'}
    except Exception as e:
        print(f"Error in api_admin_review_essay: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()
# --- Review Jawaban Essay ---


# --- Analytics ---

# Route untuk halaman analytics
@app.route('/admin/analytics')
def admin_analytics():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')
    return template('admin/analytics')

# API untuk mendapatkan data statistik
@app.route('/api/admin/analytics')
def api_get_analytics():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        analytics_data = {}
        with connection.cursor() as cursor:
            # Jumlah kuis
            sql = "SELECT COUNT(*) AS total_quizzes FROM quizzes"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['total_quizzes'] = result['total_quizzes']

            # Jumlah pengguna aktif (yang pernah mengikuti kuis)
            sql = "SELECT COUNT(DISTINCT user_id) AS active_users FROM answers"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['active_users'] = result['active_users']

            # Skor rata-rata
            sql = "SELECT AVG(score) AS average_score FROM history WHERE score IS NOT NULL"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['average_score'] = float(result['average_score']) if result['average_score'] else 0

            # Total pertanyaan
            sql = "SELECT COUNT(*) AS total_questions FROM questions"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['total_questions'] = result['total_questions']

            # Total jawaban essay yang belum direview
            sql = """
            SELECT COUNT(*) AS pending_essays
            FROM answers a
            JOIN questions q ON a.question_id = q.question_id
            LEFT JOIN essay_reviews er ON a.answer_id = er.answer_id
            WHERE q.question_type = 'essay' AND er.review_id IS NULL
            """
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['pending_essays'] = result['pending_essays']

        return {'analytics': analytics_data}
    finally:
        connection.close()

# --- Analytics ---

# API untuk mendapatkan daftar kuis yang tersedia
@app.route('/api/user/quizzes')
def api_user_get_quizzes():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        abort(403, "Unauthorized access.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT quiz_id, title, description FROM quizzes"
            cursor.execute(sql)
            quizzes = cursor.fetchall()
        return {'quizzes': quizzes}
    finally:
        connection.close()

# Route untuk mengambil kuis
@app.route('/user/take-quiz/<quiz_id:int>')
def user_take_quiz(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        return redirect('/login')
    return template('user/take_quiz', quiz_id=quiz_id)

# API untuk mendapatkan pertanyaan kuis
@app.route('/api/user/quiz-questions/<quiz_id:int>')
def api_user_get_quiz_questions(quiz_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT q.question_id, q.question_text, q.question_type,
                   GROUP_CONCAT(o.option_id SEPARATOR ',') AS option_ids,
                   GROUP_CONCAT(o.option_text SEPARATOR '|') AS option_texts
            FROM questions q
            LEFT JOIN options o ON q.question_id = o.question_id
            WHERE q.quiz_id = %s
            GROUP BY q.question_id
            """
            cursor.execute(sql, (quiz_id,))
            questions = cursor.fetchall()
        return {'questions': questions}
    finally:
        connection.close()

# API untuk mengirim jawaban kuis dan menyimpan skor ke history
@app.route('/api/user/submit-quiz', method='POST')
def api_user_submit_quiz():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        abort(403, "Unauthorized access.")

    user_id = session.get('user_id')
    quiz_id = request.forms.get('quiz_id')
    answers = request.forms.get('answers')  # JSON string

    if not quiz_id or not answers:
        abort(400, "Missing required fields.")

    import json
    answers = json.loads(answers)

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Mulai transaksi
            connection.begin()

            # Insert ke tabel history dengan skor awal 0
            sql = """
            INSERT INTO history (user_id, quiz_id, score, started_at, finished_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            """
            cursor.execute(sql, (user_id, quiz_id, 0))
            history_id = cursor.lastrowid  # ID dari entry history yang baru dibuat

            answer_ids = []
            for ans in answers:
                question_id = int(ans['question_id'])  # Konversi ke integer
                question_type = ans['question_type']
                if question_type == 'multiple_choice':
                    # Simpan jawaban ke tabel answers
                    sql = """
                    INSERT INTO answers (user_id, quiz_id, question_id, history_id)
                    VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(sql, (user_id, quiz_id, question_id, history_id))
                    answer_id = cursor.lastrowid
                    selected_options = ans.get('selected_options', [])
                    # Pastikan selected_options adalah list of integers
                    selected_options = [int(opt_id) for opt_id in selected_options]
                    answer_ids.append({
                        'question_id': question_id,
                        'question_type': question_type,
                        'answer_id': answer_id,
                        'selected_options': selected_options
                    })
                    # Simpan opsi yang dipilih ke tabel answer_options
                    for option_id in selected_options:
                        sql = """
                        INSERT INTO answer_options (answer_id, option_id)
                        VALUES (%s, %s)
                        """
                        cursor.execute(sql, (answer_id, option_id))
                elif question_type == 'essay':
                    # Simpan jawaban essay
                    answer_text = ans.get('answer_text', '')
                    sql = """
                    INSERT INTO answers (user_id, quiz_id, question_id, answer_text, history_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql, (user_id, quiz_id, question_id, answer_text, history_id))
                    answer_id = cursor.lastrowid
                    answer_ids.append({
                        'question_id': question_id,
                        'question_type': question_type,
                        'answer_id': answer_id,
                        'answer_text': answer_text
                    })

            # Dapatkan semua pertanyaan dan jenisnya
            sql = """
            SELECT question_id, question_type FROM questions WHERE quiz_id = %s
            """
            cursor.execute(sql, (quiz_id,))
            questions = cursor.fetchall()
            total_questions = len(questions)

            # Siapkan mapping question_id ke question_type
            question_types = {q['question_id']: q['question_type'] for q in questions}

            # Dapatkan opsi yang benar untuk multiple choice
            sql = """
            SELECT q.question_id,
                   GROUP_CONCAT(o.option_id ORDER BY o.option_id SEPARATOR ',') AS correct_option_ids
            FROM questions q
            JOIN options o ON q.question_id = o.question_id
            WHERE q.quiz_id = %s AND o.is_correct = 1
            GROUP BY q.question_id
            """
            cursor.execute(sql, (quiz_id,))
            correct_options = cursor.fetchall()
            correct_options_dict = {}
            for co in correct_options:
                qid = int(co['question_id'])
                correct_option_ids = [int(opt_id) for opt_id in co['correct_option_ids'].split(',')]
                correct_options_dict[qid] = correct_option_ids

            # Inisialisasi total poin yang diperoleh
            total_points_earned = 0
            total_possible_points = total_questions  # Mengasumsikan setiap pertanyaan bernilai 1 poin

            # Proses jawaban dan hitung skor
            for ans in answer_ids:
                qid = int(ans['question_id'])
                if ans['question_type'] == 'multiple_choice':
                    selected_option_ids = ans['selected_options']
                    selected_option_ids_set = set(selected_option_ids)
                    correct_option_ids = correct_options_dict.get(qid, [])
                    correct_option_ids_set = set(correct_option_ids)
                    if selected_option_ids_set == correct_option_ids_set:
                        total_points_earned += 1  # Tambahkan 1 poin untuk jawaban benar
                elif ans['question_type'] == 'essay':
                    # Jawaban essay akan dinilai nanti
                    pass

            # Hitung skor awal (tanpa skor essay)
            score = (total_points_earned / total_possible_points) * 100 if total_possible_points > 0 else 0

            # Update skor di tabel history
            sql = """
            UPDATE history SET score = %s, finished_at = NOW() WHERE history_id = %s
            """
            cursor.execute(sql, (score, history_id))

            # Commit transaksi
            connection.commit()
            return {'status': 'success', 'score': score, 'history_id': history_id}  # Tambahkan 'history_id' di sini

    except Exception as e:
        print(f"Error in api_user_submit_quiz: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()

# Route untuk melihat hasil kuis
@app.route('/user/quiz-results/<quiz_id:int>/<history_id:int>')
def user_quiz_results(quiz_id, history_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        return redirect('/login')
    return template('user/results', quiz_id=quiz_id, history_id=history_id)

# API untuk mendapatkan hasil kuis
@app.route('/api/user/quiz-results/<quiz_id:int>/<history_id:int>')
def api_user_get_quiz_results(quiz_id, history_id):
    session = request.environ.get('beaker.session')
    user_id = session.get('user_id')
    if not user_id:
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Dapatkan entri history spesifik berdasarkan history_id
            sql = """
            SELECT history_id, score FROM history
            WHERE user_id = %s AND quiz_id = %s AND history_id = %s
            """
            cursor.execute(sql, (user_id, quiz_id, history_id))
            history = cursor.fetchone()
            if not history:
                abort(404, "Quiz attempt not found.")

            score = float(history['score']) if history['score'] is not None else 0.0

            # Dapatkan jawaban pengguna untuk history_id tersebut
            sql = """
            SELECT a.answer_id, q.question_id, q.question_text, q.question_type,
                   a.answer_text,
                   GROUP_CONCAT(ao.option_id SEPARATOR ',') AS selected_option_ids
            FROM answers a
            LEFT JOIN answer_options ao ON a.answer_id = ao.answer_id
            JOIN questions q ON a.question_id = q.question_id
            WHERE a.user_id = %s AND a.quiz_id = %s AND a.history_id = %s
            GROUP BY a.answer_id, q.question_id, q.question_text, q.question_type, a.answer_text
            """
            cursor.execute(sql, (user_id, quiz_id, history_id))
            user_answers = cursor.fetchall()

            # Dapatkan opsi yang benar
            sql = """
            SELECT q.question_id,
                   GROUP_CONCAT(o.option_id SEPARATOR ',') AS correct_option_ids
            FROM questions q
            JOIN options o ON q.question_id = o.question_id
            WHERE q.quiz_id = %s AND o.is_correct = 1
            GROUP BY q.question_id
            """
            cursor.execute(sql, (quiz_id,))
            correct_options = cursor.fetchall()

            # Konversi question_id ke string untuk konsistensi kunci di JSON
            correct_options_dict = {str(co['question_id']): co['correct_option_ids'].split(',') for co in correct_options}

            # Dapatkan review untuk pertanyaan essay
            sql = """
            SELECT a.question_id, er.score AS essay_score, er.feedback
            FROM answers a
            JOIN essay_reviews er ON a.answer_id = er.answer_id
            JOIN questions q ON a.question_id = q.question_id
            WHERE a.user_id = %s AND a.quiz_id = %s AND a.history_id = %s AND q.question_type = 'essay'
            """
            cursor.execute(sql, (user_id, quiz_id, history_id))
            essay_reviews = cursor.fetchall()

            # Bangun essay_reviews_dict
            essay_reviews_dict = {}
            for er in essay_reviews:
                question_id = str(er['question_id'])
                essay_score = float(er['essay_score']) if er['essay_score'] is not None else 0.0
                feedback = er['feedback']
                essay_reviews_dict[question_id] = {'score': essay_score, 'feedback': feedback}

            return {
                'user_answers': user_answers,
                'score': score,
                'essay_reviews': essay_reviews_dict,
                'correct_options': correct_options_dict  # Tambahkan ini
            }
    except Exception as e:
        print(f"Error in api_user_get_quiz_results: {e}")
        import traceback
        traceback.print_exc()
        response.status = 500
        return {'status': 'error', 'message': 'Internal Server Error'}
    finally:
        connection.close()

# Route untuk melihat riwayat kuis
@app.route('/user/quiz-history')
def user_quiz_history():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session:
        return redirect('/login')
    return template('user/history')

# API untuk mendapatkan riwayat kuis pengguna
@app.route('/api/user/quiz-history')
def api_user_get_quiz_history():
    session = request.environ.get('beaker.session')
    user_id = session.get('user_id')
    if not user_id:
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            SELECT h.history_id, q.quiz_id, q.title, q.description, h.finished_at
            FROM history h
            JOIN quizzes q ON h.quiz_id = q.quiz_id
            WHERE h.user_id = %s
            ORDER BY h.finished_at DESC
            """
            cursor.execute(sql, (user_id,))
            history = cursor.fetchall()

            # Convert 'finished_at' to string format
            for entry in history:
                if entry['finished_at']:
                    entry['finished_at'] = entry['finished_at'].strftime('%Y-%m-%d %H:%M:%S')
                else:
                    entry['finished_at'] = 'Belum selesai'

        return {'history': history}
    except Exception as e:
        print(f"Error in api_user_get_quiz_history: {e}")
        import traceback
        traceback.print_exc()
        abort(500, "Internal Server Error")
    finally:
        connection.close()

# Route untuk menyajikan file statis
@app.route('/static/<filepath:path>')
def serve_static(filepath):
    return static_file(filepath, root='./static')

# Jalankan aplikasi
if __name__ == '__main__':
    run(app=wrapped_app, host='localhost', port=8080, debug=True, reloader=True)
