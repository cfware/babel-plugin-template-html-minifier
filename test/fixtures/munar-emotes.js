import html from 'bel'
import truncate from 'truncate-url'

function Emote ({ id, url }) {
  return html`
    <tr class="stripe-dark">
      <td class="pv2 ph3 name">${id}</td>
      <td class="pv2 ph3">
        <a href="${url}" title="${url}" class="link dim light-pink" target="_blank">
          ${truncate(url, 50)}
        </a>
      </td>
    </tr>
  `
}

function onclick (event) {
  if (!event.target.classList.contains('name')) {
    return
  }
  var s = window.getSelection()
  var r = document.createRange()
  r.selectNodeContents(event.target)
  s.removeAllRanges()
  s.addRange(r)
}

export function renderEmotesList (emotes) {
  return html`
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="stylesheet" href="https://unpkg.com/tachyons@4.6.1/css/tachyons.min.css">
    </head>
    <body class="bg-dark-gray near-white mh5 mv3">
      <table class="collapse" style="margin: auto">
        <thead><tr>
          <th class="pv2 ph3 ttu">Name</th>
          <th class="pv2 ph3 ttu">URL</th>
        </tr></thead>
        <tbody>
          ${emotes.map(Emote)}
        </tbody>
      </table>
      <script>
        if (document.body.classList) onclick = ${onclick.toString()}
      </script>
    </body>
    </html>
  `.toString()
}
