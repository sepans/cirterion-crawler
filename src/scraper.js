 
const fsp = require('fs').promises;
const scraperjs = require('scraperjs')

/*
the file is created by going to https://www.criterion.com/current/top-10-lists,
loading all the pages manually (clicking show more) and running these in console

links = document.querySelectorAll('.tout-default a')
hrefs = Array.prototype.map.call(links, link => link.href)
copy(JSON.stringify({ links:  hrefs}, null, 2))

*/
const DATA_PATH = './data/links.json'
const TOP_10_PATH = './data/top10.json'
const MOVIES_PATH = './data/movies.json'

async function scrapeTop10() {
  
  const  links = await readJSONFile(DATA_PATH).links
  
  const scrapers = links.map(link => {
    return scraperjs.StaticScraper.create(link)
      .scrape(($) => {
        const name = $('h1').text()
        console.log(`scraping ${name}`)
        const bio = $(".intro p").text()
        const topList = $("ul.editorial-filmlist li").map(function(aa)  {
          const link = $(this).find('.editorial-film-listitem__thumbnail-img a')[0]
          const href = $(link).attr('href')
          const thumbnail = $(link).find('img').attr('src')

          const content = $(this).find('.content')[0]
          const count = $(content).find('.count').text().trim()
          const title = $(content).find('.editorial-film-listitem__title').text()
          const director = $(content).find('.editorial-film-listitem__director').text()

          const desc = $(content).find('.editorial-film-listitem__desc').text()

          return { href, thumbnail,  count, title, director, desc }
        })
        return {
          name,
          link,
          bio,
          topList: Array.from(topList)
        }
      })
  })

  Promise.all(scrapers).then(async (data) => {
    await fsp.writeFile(TOP_10_PATH, JSON.stringify(data, null, 2))
    console.log('done')
  })
}

async function scrapeMovies() {
  
  const  top10s = await readJSONFile(TOP_10_PATH)
  const links = top10s.flatMap(fan => {
    const links = fan.topList.map(movie => movie.href)
    return links
  })

  const uniqueLinks = Array.from(new Set(links))
  
  console.log(`From total ${links.length} movies ${uniqueLinks.length} are unique`)


  const META_KEYS = ['director', 'country', 'year', 'duration', 'color', 'ratio', 'language']

  const scrapers = uniqueLinks.map(link => {
    console.log(`visiting  ${link}`)
    return scraperjs.StaticScraper.create(link)
      .scrape(($) => {
        const name = $('h1').text()
        const cover = $('.product-box-art img').attr('src')
        console.log(`scraping movie ${name}`)
        const meta = $(".film-meta-list li").map(function(index)  {
          const ret = {}
          // FIXME: when year is missing everything shifts....
          if(index < 7) {
            const content = $(this).text().trim().replace(/\s+/g,' ') // removes spaces in the middles
            const key = META_KEYS[index]
            ret[key] = content
            return  ret
          }
        })
        const reducedMeta = Array.from(meta).reduce((acc, cur) => {
          return {...acc, ...cur}
        }, {})
        return {
          name,
          cover,
          ...reducedMeta
        }
      })
  })

  Promise.all(scrapers).then(async (data) => {
    await fsp.writeFile(MOVIES_PATH, JSON.stringify(data, null, 2))
    console.log('done')
  })
}

async function readJSONFile(path) {
  const data = await fsp.readFile(path, {encoding: 'utf8'})
  return JSON.parse(data)
}

exports.scrapeTop10 = scrapeTop10
exports.scrapeMovies = scrapeMovies