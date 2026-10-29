MARUBENI GRÃOS BRASIL — PACOTE DE HOMOLOGAÇÃO
Data: 28/10/2026

CONTEÚDO
- index.html: portal público Modelo 2 aprovado, com as 10 etapas e integração Firebase.
- firebase-config.js: configuração existente, preservada.
- firebase-portal.js: autenticação e gravação no Firestore, preservadas com correção de carregamento do painel e tratamento de falha de envio.
- painel-fiscal.html: nova interface Fiscal com duas telas.
- painel-fiscal.js: consulta de registros reais, revisão de todas as respostas, parecer, aprovação/correção e exportação.
- README_PUBLICACAO.txt: estas orientações.

IMPORTANTE — NÃO PUBLICAR SEM HOMOLOGAÇÃO
Este pacote foi preparado a partir da última versão funcional disponível na conversa.
Não foi testado contra o Firebase real, nem publicado no GitHub.
Não inclui mudanças nas regras do Firestore; manter as regras existentes.

FLUXO PARA HOMOLOGAÇÃO
1. Faça backup dos 5 arquivos atuais do repositório.
2. Crie uma branch de teste no GitHub e coloque os 5 arquivos deste ZIP na raiz.
3. Abra a prévia via hospedagem HTTPS (Firebase Auth e módulos não funcionam adequadamente via file://).
4. Teste o cadastro de um produtor fictício com todas as 10 etapas, incluindo campos condicionais.
5. Verifique no Firestore se o documento foi criado na coleção 'entrevistas' com status 'Pendente Fiscal'.
6. Acesse o Painel Fiscal com a conta autorizada e verificada no Firebase.
7. Abra o produtor, confira todas as respostas, marque as etapas e registre um parecer.
8. Aprove o cadastro e verifique a mudança para 'Aprovado Fiscal' no Firestore.
9. Teste 'Solicitar correção' em outro cadastro e verifique o status.
10. Exporte os aprovados. O arquivo gerado é CSV UTF-8 compatível com Excel, delimitado por ponto e vírgula, contendo todas as respostas.
11. Teste também o retorno ao formulário e os fluxos de rascunho, atualização e autenticação.
12. Somente após esses testes, mescle a branch de teste à principal.

ATENÇÃO
- Não use dados reais de produtores nos testes.
- A interface não altera as regras de segurança do Firestore.
- O acesso Fiscal segue a conta FISCAL_EMAIL já configurada no projeto.
- A exportação Excel está em CSV compatível com Excel (não XLSX nativo).
- A marcação das etapas é uma validação de interface por sessão, não é gravada no Firestore; o parecer e o status são gravados.
- O portal público foi mantido a partir do Modelo 2 aprovado, com adaptação dos pontos de integração.
