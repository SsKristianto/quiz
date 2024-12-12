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
                    session['username'] = user['username']  # Pastikan ini ada
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
    username = session.get('username', 'Pengguna')
    return template('user/dashboard', username=username)

# Route untuk logout
@app.route('/logout')
def logout():
    session = request.environ.get('beaker.session')
    session.delete()
    return redirect('/login')

# --- Manajemen Pengguna ---
# Route untuk halaman manajemen pengguna
@app.route('/admin/users')
def admin_manage_users():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')

    return template('admin/manage_users')

# API untuk mendapatkan daftar pengguna dengan pagination dan search/filter
@app.route('/api/admin/users')
def api_get_users():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    try:
        page = int(request.query.get('page', 1))
        limit = int(request.query.get('limit', 10))
        query = request.query.get('query', '').strip()
        role = request.query.get('role', '').strip()

        print(f"Received parameters - page: {page}, limit: {limit}, query: '{query}', role: '{role}'")

        offset = (page - 1) * limit

        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT user_id, username, email, role, created_at FROM users WHERE 1=1"
            params = []

            if query:
                sql += " AND (username LIKE %s OR email LIKE %s)"
                params.extend([f"%{query}%", f"%{query}%"])

            if role:
                sql += " AND LOWER(role) = LOWER(%s)"
                params.append(role)

            sql += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            print(f"Executing SQL: {sql} with params {params}")

            cursor.execute(sql, params)
            users = cursor.fetchall()

            # Hitung total pengguna untuk pagination
            count_sql = "SELECT COUNT(*) as total FROM users WHERE 1=1"
            count_params = []

            if query:
                count_sql += " AND (username LIKE %s OR email LIKE %s)"
                count_params.extend([f"%{query}%", f"%{query}%"])

            if role:
                count_sql += " AND LOWER(role) = LOWER(%s)"
                count_params.append(role)

            print(f"Executing Count SQL: {count_sql} with params {count_params}")

            cursor.execute(count_sql, count_params)
            total = cursor.fetchone()['total']

            # Konversi 'created_at' ke string
            for user in users:
                if isinstance(user['created_at'], datetime.datetime):
                    user['created_at'] = user['created_at'].strftime('%Y-%m-%d %H:%M:%S')

            print(f"Returning {len(users)} users out of {total} total users")

            return {'users': users, 'total': total}
    except Exception as e:
        print(f"Error in api_get_users: {e}")
        abort(500, "Internal Server Error")
    finally:
        connection.close()

# API untuk mendapatkan detail satu pengguna
@app.route('/api/admin/users/<user_id:int>')
def api_get_user(user_id):
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT user_id, username, email, role, created_at FROM users WHERE user_id = %s"
            cursor.execute(sql, (user_id,))
            user = cursor.fetchone()
            if not user:
                abort(404, "User not found.")

            if isinstance(user['created_at'], datetime.datetime):
                user['created_at'] = user['created_at'].strftime('%Y-%m-%d %H:%M:%S')

            return user
    except Exception as e:
        print(f"Error in api_get_user: {e}")
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

    if not username or not email or not role or not password:
        abort(400, "Missing required fields.")

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (username, email, hashed_password, role))
        connection.commit()
        response.status = 201
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
@app.route('/admin/review-essays')
def admin_review_essays():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        return redirect('/login')
    return template('admin/review_essays')

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
            WHERE LOWER(qs.question_type) = 'essay' 
              AND a.answer_id NOT IN (SELECT answer_id FROM essay_reviews)
            """
            cursor.execute(sql)
            essays = cursor.fetchall()
        return {'essays': essays}
    except Exception as e:
        print(f"Error in api_admin_get_essay_reviews: {e}")
        import traceback
        traceback.print_exc()
        abort(500, "Internal Server Error")
    finally:
        connection.close()

@app.route('/api/admin/review-essay', method='POST')
def api_admin_review_essay():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    reviewed_by = session.get('user_id')
    answer_id = request.forms.get('answer_id')
    score = request.forms.get('score')
    feedback = request.forms.get('feedback')

    if not answer_id or score is None:
        abort(400, "Missing required fields.")

    # Validasi input
    try:
        answer_id = int(answer_id)
        score = float(score)
        if score < 0 or score > 100:
            abort(400, "Score must be between 0 and 100.")
    except ValueError:
        abort(400, "Invalid input for answer_id or score.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Simpan review ke tabel essay_reviews
            sql = """
            INSERT INTO essay_reviews (answer_id, reviewed_by, score, feedback)
            VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (answer_id, reviewed_by, score, feedback))

            # Dapatkan history_id dan quiz_id dari answer_id
            sql = """
            SELECT history_id, quiz_id FROM answers WHERE answer_id = %s
            """
            cursor.execute(sql, (answer_id,))
            answer = cursor.fetchone()
            if not answer:
                abort(404, "Answer not found.")

            history_id = answer['history_id']
            quiz_id = answer['quiz_id']

            # Dapatkan mc_score dari tabel history
            sql = """
            SELECT mc_score FROM history WHERE history_id = %s
            """
            cursor.execute(sql, (history_id,))
            history = cursor.fetchone()
            if not history:
                abort(404, "History not found.")

            mc_score = float(history['mc_score'])  # Skor pilihan ganda tetap

            # Dapatkan total pertanyaan essay
            sql = """
            SELECT COUNT(*) AS total_essay_questions FROM questions WHERE quiz_id = %s AND question_type = 'essay'
            """
            cursor.execute(sql, (quiz_id,))
            result = cursor.fetchone()
            total_essay_questions = result['total_essay_questions'] if result else 0

            # Dapatkan total skor essay yang sudah dinilai
            sql = """
            SELECT AVG(score) AS average_essay_score
            FROM essay_reviews er
            JOIN answers a ON er.answer_id = a.answer_id
            WHERE a.history_id = %s
            """
            cursor.execute(sql, (history_id,))
            result = cursor.fetchone()
            essay_score = float(result['average_essay_score']) if result['average_essay_score'] else 0.0

            # Perbarui essay_score di tabel history
            sql = """
            UPDATE history SET essay_score = %s WHERE history_id = %s
            """
            cursor.execute(sql, (essay_score, history_id))

            # Hitung skor total dengan bobot
            # Misalkan bobot pilihan ganda 50% dan essay 50%
            total_score = (mc_score * 0.5) + (essay_score * 0.5)

            # Update skor total di tabel history
            sql = """
            UPDATE history SET score = %s WHERE history_id = %s
            """
            cursor.execute(sql, (total_score, history_id))

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

def calculate_percentage_change(current, previous):
    """
    Calculate percentage change between current and previous values.
    """
    if previous == 0:
        return 0 if current == 0 else 100
    return round(((current - previous) / previous) * 100, 2)

@app.route('/api/admin/analytics')
def api_get_analytics():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        analytics_data = {}
        with connection.cursor() as cursor:
            # Total Kuis
            sql = "SELECT COUNT(*) AS total_quizzes FROM quizzes"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['total_quizzes'] = result['total_quizzes']

            # Perubahan jumlah kuis dibanding bulan lalu
            sql_current = "SELECT COUNT(*) FROM quizzes WHERE MONTH(created_at) = MONTH(CURRENT_DATE())"
            sql_previous = "SELECT COUNT(*) FROM quizzes WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))"
            cursor.execute(sql_current)
            current_quizzes = cursor.fetchone()['COUNT(*)']
            cursor.execute(sql_previous)
            previous_quizzes = cursor.fetchone()['COUNT(*)']
            analytics_data['quizzes_change'] = calculate_percentage_change(current_quizzes, previous_quizzes)

            # Pengguna Aktif
            sql = "SELECT COUNT(DISTINCT user_id) AS active_users FROM answers WHERE MONTH(submitted_at) = MONTH(CURRENT_DATE())"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['active_users'] = result['active_users']

            # Perubahan jumlah pengguna aktif dibanding bulan lalu
            sql_current = "SELECT COUNT(DISTINCT user_id) FROM answers WHERE MONTH(submitted_at) = MONTH(CURRENT_DATE())"
            sql_previous = "SELECT COUNT(DISTINCT user_id) FROM answers WHERE MONTH(submitted_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))"
            cursor.execute(sql_current)
            current_users = cursor.fetchone()['COUNT(DISTINCT user_id)']
            cursor.execute(sql_previous)
            previous_users = cursor.fetchone()['COUNT(DISTINCT user_id)']
            analytics_data['users_change'] = calculate_percentage_change(current_users, previous_users)

            # Skor Rata-rata
            sql = "SELECT AVG(score) AS average_score FROM history WHERE score IS NOT NULL"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['average_score'] = float(result['average_score']) if result['average_score'] else 0

            # Perubahan skor rata-rata dibanding bulan lalu
            sql_current = "SELECT AVG(score) FROM history WHERE score IS NOT NULL AND MONTH(finished_at) = MONTH(CURRENT_DATE())"
            sql_previous = "SELECT AVG(score) FROM history WHERE score IS NOT NULL AND MONTH(finished_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))"
            cursor.execute(sql_current)
            current_avg_score = cursor.fetchone()['AVG(score)'] or 0
            cursor.execute(sql_previous)
            previous_avg_score = cursor.fetchone()['AVG(score)'] or 0
            analytics_data['score_change'] = calculate_percentage_change(current_avg_score, previous_avg_score)

            # Total Pertanyaan
            sql = "SELECT COUNT(*) AS total_questions FROM questions"
            cursor.execute(sql)
            result = cursor.fetchone()
            analytics_data['total_questions'] = result['total_questions']

            # Perubahan total pertanyaan dibanding bulan lalu
            sql_current = "SELECT COUNT(*) FROM questions WHERE MONTH(created_at) = MONTH(CURRENT_DATE())"
            sql_previous = "SELECT COUNT(*) FROM questions WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))"
            cursor.execute(sql_current)
            current_questions = cursor.fetchone()['COUNT(*)']
            cursor.execute(sql_previous)
            previous_questions = cursor.fetchone()['COUNT(*)']
            analytics_data['questions_change'] = calculate_percentage_change(current_questions, previous_questions)

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

            # Convert all values to JSON-friendly formats
            for key, value in list(analytics_data.items()):
                if isinstance(value, Decimal):
                    analytics_data[key] = float(value)
                elif value is None:
                    analytics_data[key] = 0

            # Set content type to JSON and return
            response.content_type = 'application/json'
            return json.dumps({'analytics': analytics_data})
    except Exception as e:
        # Log the error and return an error response
        print(f"Error in analytics endpoint: {str(e)}")
        abort(500, "Internal Server Error")
    finally:
        connection.close()

def calculate_percentage_change(current, previous):
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    else:
        return round(((current - previous) / previous) * 100, 2)

@app.route('/api/admin/recent-activities')
def api_get_recent_activities():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    connection = get_db_connection()
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            # Hanya mengambil aktivitas Mengumpulkan Essay
            sql = """
                SELECT 
                    u.username, 
                    qz.title AS quiz_title, 
                    'Mengumpulkan Essay' AS activity, 
                    a.submitted_at AS timestamp, 
                    CASE 
                        WHEN er.review_id IS NULL THEN 'Menunggu Review' 
                        ELSE 'Direview' 
                    END AS status
                FROM answers a
                JOIN users u ON a.user_id = u.user_id
                JOIN quizzes qz ON a.quiz_id = qz.quiz_id
                JOIN questions q ON a.question_id = q.question_id
                LEFT JOIN essay_reviews er ON a.answer_id = er.answer_id
                WHERE q.question_type = 'essay'
                ORDER BY timestamp DESC
                LIMIT 10
            """

            cursor.execute(sql)
            activities = cursor.fetchall()

            # Format timestamp ke format ISO
            for activity in activities:
                if activity['timestamp']:
                    activity['timestamp'] = activity['timestamp'].isoformat()
                else:
                    activity['timestamp'] = None

            return {'activities': activities}
    finally:
        connection.close()


# Route untuk API Mendapatkan Skor Pengguna dengan Fitur Pencarian
@app.route('/api/admin/user-scores')
def api_get_user_scores():
    session = request.environ.get('beaker.session')
    if 'user_id' not in session or not is_admin(session):
        abort(403, "Unauthorized access.")

    search_query = request.query.get('search', '').strip()

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Dasar Query SQL
            sql = """
                SELECT
                    h.history_id,
                    u.username,
                    q.title AS quiz_title,
                    h.score AS total_score,
                    h.mc_score,
                    h.essay_score,
                    h.finished_at
                FROM history h
                JOIN users u ON h.user_id = u.user_id
                JOIN quizzes q ON h.quiz_id = q.quiz_id
                WHERE h.finished_at IS NOT NULL
            """

            params = []

            # Jika ada parameter pencarian, tambahkan kondisi WHERE
            if search_query:
                sql += " AND u.username LIKE %s"
                params.append(f"%{search_query}%")

            sql += " ORDER BY h.finished_at DESC LIMIT 10"

            cursor.execute(sql, params)
            results = cursor.fetchall()

            # Format data untuk JSON dengan mengonversi Decimal ke float
            user_scores = []
            for row in results:
                user_score = {
                    'username': row['username'],
                    'quiz_title': row['quiz_title'],
                    'total_score': float(row['total_score']) if row['total_score'] is not None else None,
                    'mc_score': float(row['mc_score']) if row['mc_score'] is not None else None,
                    'essay_score': float(row['essay_score']) if row['essay_score'] is not None else None,
                    'finished_at': row['finished_at'].isoformat() if row['finished_at'] else None
                }
                user_scores.append(user_score)

            return {'user_scores': user_scores}
    finally:
        connection.close()


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

            # Hitung skor pilihan ganda terlebih dahulu
            total_mc_questions = 0
            total_mc_correct = 0
            total_essay_questions = 0

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

            # Proses jawaban dan hitung skor
            for ans in answers:
                question_id = int(ans['question_id'])
                question_type = ans['question_type']
                if question_type == 'multiple_choice':
                    total_mc_questions += 1
                    selected_option_ids = [int(opt_id) for opt_id in ans.get('selected_options', [])]
                    selected_option_ids_set = set(selected_option_ids)
                    correct_option_ids = correct_options_dict.get(question_id, [])
                    correct_option_ids_set = set(correct_option_ids)
                    if selected_option_ids_set == correct_option_ids_set:
                        total_mc_correct += 1  # Tambahkan 1 poin untuk jawaban benar
                elif question_type == 'essay':
                    total_essay_questions += 1
                    # Jawaban essay akan dinilai nanti

            # Hitung skor pilihan ganda
            if total_mc_questions > 0:
                mc_score = (total_mc_correct / total_mc_questions) * 100
            else:
                mc_score = 0

            # Skor essay akan ditambahkan setelah dinilai oleh admin
            essay_score = 0  # Inisialisasi skor essay menjadi 0

            # Skor total awal adalah skor pilihan ganda saja
            total_score = mc_score  # Nanti akan ditambahkan dengan skor essay setelah dinilai

            # Insert ke tabel history dengan mc_score dan essay_score
            sql = """
            INSERT INTO history (user_id, quiz_id, mc_score, essay_score, score, started_at, finished_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """
            cursor.execute(sql, (user_id, quiz_id, mc_score, essay_score, total_score))
            history_id = cursor.lastrowid  # ID dari entry history yang baru dibuat

            # Simpan jawaban ke tabel answers
            for ans in answers:
                question_id = int(ans['question_id'])
                question_type = ans['question_type']
                if question_type == 'multiple_choice':
                    sql = """
                    INSERT INTO answers (user_id, quiz_id, question_id, history_id)
                    VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(sql, (user_id, quiz_id, question_id, history_id))
                    answer_id = cursor.lastrowid
                    selected_options = [int(opt_id) for opt_id in ans.get('selected_options', [])]
                    # Simpan opsi yang dipilih ke tabel answer_options
                    for option_id in selected_options:
                        sql = """
                        INSERT INTO answer_options (answer_id, option_id)
                        VALUES (%s, %s)
                        """
                        cursor.execute(sql, (answer_id, option_id))
                elif question_type == 'essay':
                    answer_text = ans.get('answer_text', '')
                    sql = """
                    INSERT INTO answers (user_id, quiz_id, question_id, answer_text, history_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(sql, (user_id, quiz_id, question_id, answer_text, history_id))
                    answer_id = cursor.lastrowid
                    # Tidak perlu menyimpan ke answer_options untuk essay

            # Commit transaksi
            connection.commit()

            # Kembalikan skor pilihan ganda dan informasi lainnya
            return {
                'status': 'success',
                'mc_score': mc_score,
                'essay_score': essay_score,
                'total_score': total_score,
                'history_id': history_id
            }

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
            # Dapatkan skor dari tabel history
            sql = """
            SELECT mc_score, essay_score, score AS total_score FROM history WHERE history_id = %s AND user_id = %s
            """
            cursor.execute(sql, (history_id, user_id))
            history = cursor.fetchone()
            if not history:
                abort(404, "History not found.")

            mc_score = float(history['mc_score'])
            essay_score = float(history['essay_score'])
            total_score = float(history['total_score'])

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
                essay_score_value = float(er['essay_score']) if er['essay_score'] is not None else 0.0
                feedback = er['feedback']
                essay_reviews_dict[question_id] = {'score': essay_score_value, 'feedback': feedback}

            return {
                'user_answers': user_answers,
                'mc_score': mc_score,
                'essay_score': essay_score,
                'total_score': total_score,
                'essay_reviews': essay_reviews_dict,
                'correct_options': correct_options_dict
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
    return template('user/dashboard')

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
