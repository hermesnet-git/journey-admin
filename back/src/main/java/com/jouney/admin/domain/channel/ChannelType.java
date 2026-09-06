package com.jouney.admin.domain.channel;

// URA/CONTACT_CENTER/OTHER removidos: exigiriam um paradigma de renderização totalmente diferente
// (áudio/atendente humano) em vez de uma tela SDUI visual — fora de escopo. Canal deixou de ser uma
// entidade com CRUD e virou um valor de domínio fixo, direto no Produto/Jornada.
public enum ChannelType {
    WEB,
    MOBILE,
    WHATSAPP
}
