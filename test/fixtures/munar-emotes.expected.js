import html from 'bel';
import truncate from 'truncate-url';

function Emote({ id, url }) {
  return html`<tr class=stripe-dark><td class="ph3 pv2 name">${id}<td class="ph3 pv2"><a class="dim light-pink link"href="${url}"target=_blank title="${url}">${truncate(url, 50)}</a>`;
}

function onclick(event) {
  if (!event.target.classList.contains('name')) {
    return;
  }
  var s = window.getSelection();
  var r = document.createRange();
  r.selectNodeContents(event.target);
  s.removeAllRanges();
  s.addRange(r);
}

export function renderEmotesList(emotes) {
  return html`<meta charset=utf-8><link rel=stylesheet href=https://unpkg.com/tachyons@4.6.1/css/tachyons.min.css><body class="bg-dark-gray near-white mh5 mv3"><table class=collapse style="margin: auto"><thead><tr><th class="ph3 pv2 ttu">Name<th class="ph3 pv2 ttu">URL<tbody>${emotes.map(Emote)}</table><script>if (document.body.classList) onclick = ${onclick.toString()}</script>`.toString();
}
