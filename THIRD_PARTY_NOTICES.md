# Third-party notices

Ad Mirror's own code is released under the MIT licence (see `LICENSE`). It includes or is derived from the work below.

## Shipped inside the extension

### idb

https://github.com/jakearchibald/idb · ISC licence

Copyright (c) 2016, Jake Archibald <jaffathecake@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### tldts

https://github.com/remusao/tldts · MIT licence

Copyright (c) 2017 Thomas Parisot, 2018 Rémi Berson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

tldts includes the [Public Suffix List](https://publicsuffix.org/), which is licensed under the [Mozilla Public License 2.0](https://mozilla.org/MPL/2.0/).

## Data

### AdGuard companiesdb (tracker and company data)

https://github.com/AdguardTeam/companiesdb · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

`extension/data/trackers.json` is derived from AdGuard companiesdb, which itself builds on data from [WhoTracks.me](https://whotracks.me/) by Ghostery. Changes: filtered to advertising, site analytics, social media and customer interaction trackers; descriptions removed; some company names shortened. The derived file is licensed under CC BY-SA 4.0.

## Adapted code

### Omnibug (tracking request decoders)

https://github.com/MisterPhilip/omnibug · MIT licence

Copyright (c) 2017 Philip Lawrence

The endpoint patterns and event-name locations in `extension/src/classify/pixels.ts` are adapted from Omnibug's provider definitions. The MIT permission notice above (under tldts) applies to them with this copyright line.
