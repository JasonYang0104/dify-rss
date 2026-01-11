import { load } from 'cheerio';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
        const limit = parseInt(req.query.limit) || 20;
        const baseUrl = 'https://dify.ai';

      const response = await fetch(`${baseUrl}/blog`);
        const html = await response.text();
        const $ = load(html);

      const items = [];
        const articleLinks = new Set();

      // Extract article links - dify.ai uses ./blog/slug pattern
      $('a[href^="./blog/"]').each((_, el) => {
              const href = $(el).attr('href');
              // Filter out the main blog page itself
                                         if (href && href !== './blog' && href.match(/^\.\/blog\/[^\/]+$/)) {
                                                   articleLinks.add(href);
                                         }
      });

      const linksArray = Array.from(articleLinks).slice(0, limit);

      for (const link of linksArray) {
              try {
                        const articleUrl = link.startsWith('http') ? link : `${baseUrl}${link.replace(/^\./, '')}`;
                        const articleResponse = await fetch(articleUrl);
                        const articleHtml = await articleResponse.text();
                        const $$ = load(articleHtml);

                const title = $$('meta[property="og:title"]').attr('content') || $$('title').text() || '';
                        const description = $$('meta[name="description"]').attr('content') ||
                                                     $$('meta[property="og:description"]').attr('content') || '';

                // dify.ai doesn't have article:published_time meta tag
                let pubDate = null;

                const image = $$('meta[property="og:image"]').attr('content') || '';

                if (title) items.push({ title, link: articleUrl, description, pubDate, image });
              } catch (error) {
                        console.error(`Error fetching ${link}:`, error.message);
              }
      }

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
            <title>Dify Blog</title>
                <link>${baseUrl}/blog</link>
                    <description>Unlock Agentic AI with Dify. Develop, deploy, and manage autonomous agents, RAG pipelines, and more for teams at any scale, effortlessly.</description>
                        <language>en-us</language>
                        ${items.map(item => `    <item>
                              <title><![CDATA[${item.title}]]></title>
                                    <link>${item.link}</link>
                                          <description><![CDATA[${item.description}]]></description>
                                                ${item.pubDate ? `<pubDate>${item.pubDate}</pubDate>` : ''}
                                                      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg"/>` : ''}
                                                          </item>`).join('\n')}
                                                            </channel>
                                                            </rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(rss);
  } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error: ${error.message}`);
  }
}
