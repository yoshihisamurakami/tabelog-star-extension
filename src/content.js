/*
  食べログスター拡張: v0.0.1
  食べログの（重み付き）スターの下に、口コミ評価の平均点をスター表示するGoogle Chrome extension(拡張)です。
*/

const LocalStorageWrapper = {
  getScore: () => {
    const json = localStorage.getItem('score')
    return JSON.parse(json)
  },
  setScore(newValJson) {
    localStorage.setItem('score', newValJson)
  }
}

class LocalStorageAverageScore {
  constructor(scorePageUrl) {
    this.scorePageUrl = scorePageUrl
  }

  get() {
    const allScore = LocalStorageWrapper.getScore()
    if (Array.isArray(allScore) === false) {
      return null
    }
    const key = this._key()
    const targetPageInfo = allScore.find((v) => 
      v.key === key
    );
    if (targetPageInfo === undefined) { return null }
    if (targetPageInfo.expireTime < this._nowSec()) {
      this.remove()
      return null
    }
    return targetPageInfo.score
  }

  set(score) {
    const oldVal = LocalStorageWrapper.getScore()
    const additionalVal = this._additionalVal(score)
    const newVal = (oldVal === null) ? [additionalVal] : [...oldVal, additionalVal]
    const newValJson = JSON.stringify(newVal)
    LocalStorageWrapper.setScore(newValJson)
  }

  remove() {
    const oldVal = LocalStorageWrapper.getScore()
    const newVal = oldVal.filter(v => {
      if (v.key !== this._key()) {
        return v
      }
    })
    const newValJson = JSON.stringify(newVal)
    LocalStorageWrapper.setScore(newValJson)
  }

  _key() {
    const pattern = /^https:\/\/tabelog\.com\/(\w+\/A\d{4}\/A\d{6}\/\d{7,8}\/)/g
    const result = pattern.exec(this.scorePageUrl)
    if (result === null) { return '' }
    return result[1]
  }

  _additionalVal(score) {
    const key = this._key(this.scorePageUrl)
    const expireTime = this._expireTime()
    return {
      key,
      score,
      expireTime
    }
  }

  _expireTime() {
    return this._nowSec() + 60 * 60 * 24
  }

  _nowSec() {
    const date = new Date()
    const timeMsec = date.getTime()
    const timeSec = Math.floor(timeMsec / 1000)
    return timeSec
  }
}

const getStoreBaseUrl = () => {
  const pattern = /^https:\/\/tabelog\.com\/\w+\/A\d{4}\/A\d{6}\/\d{7,8}\//g
  const storeBaseUrl = pattern.exec(location.href)
  if (storeBaseUrl === null) { return false }
  return storeBaseUrl
}

const getRatingPageUrl = (storeBaseUrl) => {
  return `${storeBaseUrl}dtlratings/`
}

const getScoreFromRatingPage = (html) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const score = doc.getElementsByClassName("ratings-contents__table-score")[0].innerHTML
  return score
}

const getRatingValClassName = (score) => {
  if (score < 1.5) {
    return `c-rating--val10`
  } else if (score < 2.0) {
    return `c-rating--val15`
  } else if (score < 2.5) {
    return `c-rating--val20`
  } else if (score < 3.0) {
    return `c-rating--val25`
  } else if (score < 3.5) {
    return `c-rating--val30`
  } else if (score < 4.0) {
    return `c-rating--val35`
  } else if (score < 4.5) {
    return `c-rating--val40`
  } else if (score < 5.0) {
    return `c-rating--val45`
  } else if (score == 5.0) {
    return `c-rating--val50`
  } else {
    return ``
  }
}

const addScoreToPageTop = (score) => {
  const element = document.getElementById('js-header-rating');
  const innerHtml = element.innerHTML
  const ratingValClassName = getRatingValClassName(score)
  const addedHtml = innerHtml + 
    `<div class="rdheader-rating__score">
      <p style="color: #797152; padding-top: 0.8em;">【口コミ平均】</p>
      <p class="c-rating ${ratingValClassName} c-rating--xxl">
        <i class="c-rating__star rdheader-rating__score-star"></i>
        <b class="c-rating__val rdheader-rating__score-val" rel="v:rating">
          <span class="rdheader-rating__score-val-dtl">${score}</span>
        </b>
      </p>
    </div>`
  element.innerHTML = addedHtml
}

const getScoreFromRatingPageUrl = async (ratingPageUrl) => {
  return await fetch(ratingPageUrl, {
    method: "GET"

  }).then(response => {
    return response.text()

  }).then(html => {
    return getScoreFromRatingPage(html)

  }).catch(error => {
    console.log(error.message)
  })
}

const addAverageScore = () => {
  const storeBaseUrl = getStoreBaseUrl()
  if (storeBaseUrl === false) { return }

  const ratingPageUrl = getRatingPageUrl(storeBaseUrl)
  const localStorageAverageScore = new LocalStorageAverageScore(ratingPageUrl)
  const localStorageScore = localStorageAverageScore.get()

  if (localStorageScore !== null) {
    addScoreToPageTop(localStorageScore)
    return
  }
  getScoreFromRatingPageUrl(ratingPageUrl).then(score => {
    addScoreToPageTop(score)
    localStorageAverageScore.set(score)
  })
}

addAverageScore()
