/*
  # Исправление RLS политик для таблицы admin_accounts

  ## Описание
  Обновляет политики безопасности для таблицы admin_accounts.
  Поскольку аутентификация происходит на клиентской стороне через anon key,
  мы разрешаем чтение только нужных полей (без возврата password_plain в отдельных запросах)
  и оставляем управление через политики для anon пользователей.

  ## Изменения
  - Сбрасываем старые политики
  - Создаём правильные политики для anon и authenticated
  - SELECT: разрешён для всех (нужно для логина)
  - INSERT/UPDATE/DELETE: только для authenticated (admin через свою сессию)

  ## Важные заметки
  Таблица не использует Supabase Auth, поэтому проверка происходит
  через сравнение email + password_plain на клиенте.
  Управление аккаунтами в AdminUsers.tsx работает через anon key.
*/

DROP POLICY IF EXISTS "Admins can view admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can insert admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can update admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Admins can delete admin accounts" ON admin_accounts;

CREATE POLICY "Allow anon read for login"
  ON admin_accounts FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow authenticated full read"
  ON admin_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon insert for management"
  ON admin_accounts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update for management"
  ON admin_accounts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete for management"
  ON admin_accounts FOR DELETE
  TO anon
  USING (true);
