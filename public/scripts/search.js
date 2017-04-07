// dependencies: module.js, fav.js, display.js

var getSearchQueryURL = function () {
  var parameters = []
  if ($('#searchbox').val() != null) {
    parameters.push('search=' + $('#searchbox').val())
  }
  if ($('#semester').val() != null) {
    parameters.push('semester=' + $('#semester').val())
  }
  if ($('#sort').val() != null) {
    parameters.push('sort=' + $('#sort').val())
  }
  return '?' + parameters.join('&')
}

// function for updating search results
var searchForCourses = function () {
  // return if no search
  if ($('#searchbox').val() === '') return false

  // construct search query
  var search = '/api/search/'
  search += encodeURIComponent($('#searchbox').val())
  search += '?semester=' + $('#semester').val()
  search += '&sort=' + $('#sort').val()

  window.history.replaceState({courseID: document.courseID}, null, window.location.pathname + getSearchQueryURL())

  // search!
  $.get(search, function (results, success) {
    if (!success) {
      window.alert('An error occured and your search could not be completed.')
      return false
    }

    // Remove any search results already in the results pane
    $('#results').children().remove()

    var len = results.length

    // Update the search results sub-heading
    $('#search-title').text(len + ' Search Result' + (len !== 1 ? 's' : ''))

    // List the returned courses in the search results pane
    for (var index in results) {
      var result = results[index]
      $('#results').append(newDOMResult(result, {"tags": 1}))
    }
  })
}

// length of non-instructor results (for temporary hiding of instructors)
function courseLength(results) {
  var count = 0
  for (var index in results)
    if (results[index].type !== 'instructor') count++

  return count
}

// returns a DOM object for a search result
function newDOMResult(result, props) {
  if (result.type === 'instructor') return newDOMinstructorResult(result, props)
  /*if (result.type === 'course')*/ return newDOMcourseResult(result, props)
}

// returns a DOM object for a search result of an instructor
function newDOMinstructorResult(instructor, props) {
  var name = instructor.name.first + ' ' + instructor.name.last

  // html string for the DOM object
  var htmlString = (
    '<li class="list-group-item instructor-list-item">'
    + '<div class="flex-container-row">'
      + '<div class="flex-item-stretch truncate">'
        + '<strong>' + name + '</strong>'
      + '</div>'
      + '<div class="flex-item-rigid">'
        + '<span class="badge">' + instructor.courses.length + '</span> '
        + '<i class="text-button fa fa-lg fa-caret-down"></i>'
      + '</div>'
    + '</div>'
    + '<ul class="list-group instructor-body" style="display:none;">'
    + '</ul>'
  + '</li>'
  )

  var entry = $.parseHTML(htmlString)[0]  // create DOM object
  var icon = $(entry).find('i')[0]        // find icon
  icon.instructorId = instructor._id      // attach instructor id
  var body = $(entry).find('ul')[0]       // body of instructor result
  $(icon).click(function() {toggleInstructor(icon, body); return false})

  return entry
}

// handles clicking the button to toggle instructors
// - icon: DOM object of toggling icon
// - body: DOM object of place to insert courses
function toggleInstructor(icon, body) {
  var isEmpty = $(body).is(':empty')

  if (isEmpty) {
    loadInstructor(icon, body)
    return
  }

  var isVisible = $(body).css('display') !== 'none'

  $(icon).removeClass(isVisible ? 'fa-caret-up' : 'fa-caret-down')
  $(icon).addClass(isVisible ? 'fa-caret-down' : 'fa-caret-up')
  $(body).slideToggle()
}

// handles loading instructor courses
// - icon: DOM object of toggling icon
// - body: DOM object of place to insert courses
function loadInstructor(icon, body) {
  $.get('/api/instructor/' + icon.instructorId, function (instructor) {
    var courses = instructor.courses;
    for (var index in courses) {
      var course = courses[index]
      console.log(course)
      $(body).append(newDOMcourseResult(course, {'tags' : 1, 'semester': 1}))
    }

    $(icon).removeClass('fa-caret-down')
    $(icon).addClass('fa-caret-up')
    $(body).slideToggle()
  })
}

// returns a DOM object for a search or favorite result of a course
// includes:
//   -- course object linking
//   -- clicking to favorite/unfavorite (+ course id linking for icon)
// props: properties for conditional rendering:
//  - 'semester' is defined => displays semester name too
function newDOMcourseResult(course, props) {
  var isFav = (document.favorites.indexOf(course["_id"]) !== -1)

  var hasScore = (course.hasOwnProperty('scores') && course.scores.hasOwnProperty('Overall Quality of the Course'))

  if (hasScore)
    var score = course.scores['Overall Quality of the Course']

  // append semester if appropriate
  var semester = props.hasOwnProperty('semester') ? '<strong><small class="text-dim">' + course.semester.name + '</small></strong> ' : ''

  // tags: dist / pdf / audit
  var tags = ''
  if (props.hasOwnProperty('tags')) {
    if (course.distribution !== undefined) tags += ' <span class="text-info-dim">' + course.distribution + '</span>'
    if (course.hasOwnProperty('pdf')) {
      if (course.pdf.hasOwnProperty('required') && course.pdf.required) tags += ' <span class="text-danger-dim">P</span>'
      else if (course.pdf.hasOwnProperty('permitted') && !course.pdf.permitted) tags += ' <span class="text-danger-dim">N</span>'
    }
    if (course.audit) tags += ' <span class="text-warning-dim">A</span>'
    if (tags !== '') tags = '<small>\xa0' + tags + '</small>'
  }

  // html string for the DOM object
  var htmlString = (
    '<li class="list-group-item search-result">'
    + '<div class="flex-container-row">'
      + '<div class="flex-item-stretch truncate">'
        + '<strong>' + mainListing(course) + crossListings(course) + tags + '</strong>'
      + '</div>'
      + '<div class="flex-item-rigid">'
        + semester
        + '<i class="fa fa-heart ' + (isFav ? 'unfav-icon' : 'fav-icon') + '"></i> '
        + '<span class="badge"' + (hasScore ? ' style="background-color: ' + colorAt(score) + '"' : '') + '>'
          + (hasScore ? score.toFixed(2) : 'N/A')
        + '</span>'
      + '</div>'
    + '</div>'
    + '<div class="truncate">'
      + course.title
    + '</div>'
  + '</li>'
  )

  var entry = $.parseHTML(htmlString)[0]                                     // create DOM object
  $(entry).find('i').click(function() {toggleFav(course._id); return false}) // enable click to fav/unfav
  entry.course = course                                                      // attach course object
  $(entry).click(function() {displayResult($(entry), course)})               // enable click to display

  return entry
}
