---
title: Hans Gerwitz
---
{% for entry in collections.about %}
{% if entry.url == "/about/" %}
{{ entry.page.rawInput | typst(entry.url) | safe }}
{% endif %}
{% endfor %}
