import { Request, Response } from 'express';
import * as net from 'net';
import * as tls from 'tls';
import nodemailer from 'nodemailer';
import { ServerModel } from '../models/server.model';
import { encrypt, decrypt } from '../services/encryption.service';

function testTcpConnection(host: string, port: number, secure: 'ssl' | 'starttls' | 'none'): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const TIMEOUT = 8000;
    let socket: net.Socket | tls.TLSSocket;

    const onConnect = () => {
      socket.destroy();
      resolve({ ok: true });
    };

    const onError = (err: Error) => {
      resolve({ ok: false, error: err.message });
    };

    if (secure === 'ssl') {
      socket = tls.connect({ host, port, rejectUnauthorized: false }, onConnect);
    } else {
      socket = net.createConnection({ host, port }, onConnect);
    }

    socket.setTimeout(TIMEOUT);
    socket.on('error', onError);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'Délai de connexion dépassé' });
    });
  });
}

export const ServersController = {
  async list(_req: Request, res: Response): Promise<void> {
    const servers = await ServerModel.findAll();
    res.json(servers);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const server = await ServerModel.findById(req.params.id);
    if (!server) {
      res.status(404).json({ error: 'Serveur non trouvé' });
      return;
    }
    res.json(server);
  },

  async testConnection(req: Request, res: Response): Promise<void> {
    const server = await ServerModel.findByIdFull(req.params.id);
    if (!server) {
      res.status(404).json({ error: 'Serveur non trouvé' });
      return;
    }

    // Test IMAP (connectivité TCP/TLS seulement, pas d'auth utilisateur disponible)
    const imapResult = await testTcpConnection(server.imap_host, server.imap_port, server.imap_secure);

    // Test SMTP (auth complète avec les credentials stockés)
    let smtpResult: { ok: boolean; error?: string };
    try {
      const smtpPassword = decrypt(server.smtp_password_enc, server.smtp_password_iv, server.smtp_password_tag);
      const transporter = nodemailer.createTransport({
        host: server.smtp_host,
        port: server.smtp_port,
        secure: server.smtp_secure === 'ssl',
        requireTLS: server.smtp_secure === 'starttls',
        ignoreTLS: server.smtp_secure === 'none',
        auth: { user: server.smtp_user, pass: smtpPassword },
        tls: { rejectUnauthorized: false },
      });
      await transporter.verify();
      smtpResult = { ok: true };
    } catch (err: any) {
      smtpResult = { ok: false, error: err.message };
    }

    res.json({
      imap: { host: server.imap_host, port: server.imap_port, ...imapResult },
      smtp: { host: server.smtp_host, port: server.smtp_port, ...smtpResult },
    });
  },

  async create(req: Request, res: Response): Promise<void> {
    const existing = await ServerModel.findByDomain(req.body.domain);
    if (existing) {
      res.status(409).json({ error: 'Un serveur existe déjà pour ce domaine' });
      return;
    }

    const { smtp_password, ...rest } = req.body;

    if (!smtp_password) {
      res.status(400).json({ error: 'Le mot de passe SMTP est requis' });
      return;
    }

    const { enc, iv, tag } = encrypt(smtp_password);

    const server = await ServerModel.create({
      ...rest,
      smtp_password_enc: enc,
      smtp_password_iv: iv,
      smtp_password_tag: tag,
    });
    res.status(201).json(server);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { smtp_password, ...rest } = req.body;

    const updateData: any = { ...rest };

    // Rechiffrer le mot de passe seulement si un nouveau est fourni
    if (smtp_password) {
      const { enc, iv, tag } = encrypt(smtp_password);
      updateData.smtp_password_enc = enc;
      updateData.smtp_password_iv = iv;
      updateData.smtp_password_tag = tag;
    }

    const server = await ServerModel.update(req.params.id, updateData);
    if (!server) {
      res.status(404).json({ error: 'Serveur non trouvé' });
      return;
    }
    res.json(server);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const deleted = await ServerModel.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Serveur non trouvé' });
      return;
    }
    res.status(204).send();
  },
};
