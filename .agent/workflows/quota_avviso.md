# Regola Operativa: Avviso Anticipo Quota Contesto

---
description: Avvisa l'utente quando manca circa il 10% delle quote di contesto, per evitare interruzioni non controllate
---

## Regola OBBLIGATORIA per tutti gli agenti che lavorano su questo progetto

### Contesto
Questo progetto (ASD Gestionale) è un'applicazione HTML/JS monolitica di grandi dimensioni (~200KB+).
In passato, le sessioni di lavoro si sono interrotte per esaurimento quote **senza preavviso**, lasciando il codice in stato parziale e l'applicazione non funzionante.

### Regola

**OGNI agente che lavora su questo progetto DEVE:**

1. **Monitorare costantemente** il consumo di quota/contesto durante la sessione di lavoro.

2. **Quando si stima che manchi circa il 10% delle quote disponibili**, inserire il seguente avviso **nella risposta al prompt corrente** (prima che le quote finiscano):

   ```
   ⚠️ AVVISO QUOTA: Stimo che manchino circa il 10% delle quote a questa sessione.
   Completando il lavoro attuale, poi mi fermo. Ti consiglio di approvare l'avanzamento
   corrente e aprire una nuova sessione per continuare.
   ```

3. **Suddividere il lavoro** in blocchi autonomi e funzionali: ogni sessione deve terminare con l'applicazione **sempre in uno stato utilizzabile**, anche se il piano complessivo non è ancora completato.

4. **Non iniziare mai** un blocco di codice grande se non si è ragionevolmente certi di poterlo completare nella sessione corrente. Se il rischio è alto, avvisare l'utente prima di iniziare.

5. **In caso di dubbio** su quanto contesto rimane, segnalarlo proattivamente nella risposta.

### Priorità

Questa regola ha **priorità massima** e si applica **indipendentemente dall'agente scelto** (Antigravity, Gemini, o qualsiasi altro). L'utente va sempre avvisato **prima** che le quote si esauriscano, non dopo.

### Applicazione pratica

- Se stai scrivendo un blocco di codice lungo, prima di iniziarlo valuta se puoi finirlo.
- Se non puoi, scrivi prima le parti più critiche (quelle che rendono l'app funzionante) e lascia le migliorie per dopo.
- Terminate le operazioni critiche, segnala lo stato raggiunto e suggerisci cosa fare nella prossima sessione.
