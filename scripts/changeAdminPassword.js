const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function changePassword() {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3];

  if (!newPassword) {
    console.error('❌ Usage: node scripts/changeAdminPassword.js [username] <nouveau-mot-de-passe>');
    console.error('');
    console.error('Exemples:');
    console.error('  node scripts/changeAdminPassword.js MonNouveauMotDePasse      # Change le MDP de "admin"');
    console.error('  node scripts/changeAdminPassword.js john SecurePassword123    # Change le MDP de "john"');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'emailauto',
    user: process.env.DB_USER || 'emailauto',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Vérifier que l'admin existe
    const { rows } = await pool.query(
      'SELECT id, username FROM admins WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      console.error(`❌ Administrateur "${username}" non trouvé`);
      console.error('');
      console.error('Administrateurs disponibles:');
      const { rows: admins } = await pool.query('SELECT username FROM admins ORDER BY username');
      admins.forEach(a => console.error(`  - ${a.username}`));
      process.exit(1);
    }

    // Hasher le nouveau mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const hash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour en base
    await pool.query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE username = $2',
      [hash, username]
    );

    console.log('');
    console.log('✅ Mot de passe administrateur changé avec succès !');
    console.log('');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log('');
    console.log('⚠️  N\'oubliez pas de supprimer ce mot de passe de votre historique !');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

changePassword();
