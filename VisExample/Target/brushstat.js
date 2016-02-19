var contin;  // global variable to keep info about the crossfilter
var dim_loc;

var update_hist_highlight = function(){
  var selected_nodes = dim_loc.top(Infinity);
  d3.selectAll("circle.node.selectedhist")
    .classed("selectedhist", false);
  d3.selectAll("circle.node.selectedbrush")
    .classed("selectedhist", function(d){
      for (var i in selected_nodes){
        if (selected_nodes[i].name == d.name){
          return true;
        }
      }
      return false;
    });
};

// Brushing based histogram display
var brushing = function(){
    // Lasso functions to execute while lassoing
    var lasso_start = function() {
      lasso.items()
   //     .attr("r",3.5) // reset size
   //     .style("fill",null) // clear all of the fills
        .classed({"not_possible":true,"selectedbrush":false}); // style as not possible
    };

    var selected_name = [];

    var lasso_draw = function() {
      // Style the possible dots
      var selected = lasso.items().filter(function(d) {return d.possible===true});
      selected
        .classed({"not_possible":false,"possible":true, "selectedbrush": true});

      selected_name = []
      selected.each(function(d){ selected_name.push(d.name);});

      dim_loc.filter(function(d) { return selected_name.indexOf(d) >= 0;});

      update_hist_highlight();

   //   // Style the not possible dot
   //   lasso.items().filter(function(d) {return d.possible===false})
   //     .classed({"not_possible":true,"possible":false});
    };

    var lasso_end = function() {

      // Reset the style of the not selected dots
    //  lasso.items().filter(function(d) {return d.selected===false})
    //    .classed({"not_possible":false,"possible":false, "selectedbrush":true});
      update_hist_highlight();
      window.renderAll();

    };

    var brush = graph.append("g")
                .attr("class", "brush");
    // Create the area where the lasso event can be triggered
    var lasso_area = graph.append("rect")
                          .attr("width", 1200)
                          .attr("height", 1200)
                          .style("opacity",0);
    // Define the lasso
    var lasso = d3.lasso()
          .closePathDistance(75) // max distance for the lasso loop to be closed
          .closePathSelect(true) // can items be selected by closing the path?
          .hoverSelect(true) // can items by selected by hovering over them?
          .area(lasso_area) // area where the lasso can be started
          .on("start",lasso_start) // lasso start function
          .on("draw",lasso_draw) // lasso draw function
          .on("end",lasso_end); // lasso end function

    // Init the lasso on the svg:g that contains the dots
    graph.call(lasso);

    lasso.items(d3.selectAll(".node"));

}

// Adapted from Crossfilter example
var plotHists = function(){
    var dimen_list = [];
    var group_list = [];
    var charts = [];

    window.reset = function(i) {
      charts[i].filter(null);
      update_hist_highlight();
      renderAll();
    };

    var nodes  = flatten(root);
    nodes = nodes.filter(function(d){ return d.children == null } );
    contin = crossfilter(nodes); // Continous data
    // Dimensions and groups
    var keys = Object.keys(nodes[0].continuous);
    for (var i = 0; i < keys.length; i++) {
        dimen_list.push(contin.dimension(function(d){ return d.continuous[keys[i]]}));
    }
    for (var i = 0; i < dimen_list.length; i++) {
        group_list.push(dimen_list[i].group(Math.floor));
    }

    // A dimension for location
    //dim_loc =  contin.dimension(function(d) { return "x=" + d.x + ",y=" + d.y; })
    dim_loc =  contin.dimension(function(d) { return d.name; })

    // Charts
    for (var i in d3.range(Object.keys(nodes[0].continuous).length)) {
        charts.push(barChart()
                        .dimension(dimen_list[i])
                        .group(group_list[i])
                        .property(keys[i])
                      .x(d3.scale.linear()
                        .domain([dimen_list[i].bottom(1)[0].continuous[keys[i]], dimen_list[i].top(1)[0].continuous[keys[i]]])
                        .rangeRound([0, 10*24])))
    }
    // listen to the chart's brush events to update the display.
    var render = function(method){
        d3.select(this).call(method);
    }

    // re-render everything
    var renderAll = function(){
        chart.each(render);
    }

    window.renderAll = renderAll;

    var svg = d3.select(".stat")
        .append("div")
        .classed("histogram", true)
        .selectAll(".chart")
        .data(keys)
        .enter()
        .append("div")
        .classed("chart", true)
        .append("div")
        .classed("title", true)
        .text(function(d) { return d});

    var chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

    renderAll();

    function barChart() {
      if (!barChart.id) barChart.id = 0;

      var margin = {top: 10, right: 10, bottom: 20, left: 10},
          x,
          y = d3.scale.linear().range([100, 0]),
          id = barChart.id++,
          axis = d3.svg.axis().orient("bottom"),
          brush = d3.svg.brush(),
          brushDirty,
          dimension,
          group,
          property,
          round;

      function chart(div) {
        var width = x.range()[1],
            height = y.range()[0];

        y.domain([0, group.top(1)[0].value]);

        div.each(function() {
          var div = d3.select(this),
              g = div.select("g");

          // Create the skeletal chart.
          if (g.empty()) {
            div.select(".title").append("a")
                .attr("href", "javascript:reset(" + id + ")")
                .attr("class", "reset")
                .text("reset")
                .style("display", "none");

            g = div.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            g.append("clipPath")
                .attr("id", "clip-" + id)
              .append("rect")
                .attr("width", width)
                .attr("height", height);

            g.selectAll(".bar")
                .data(["background", "foreground"])
              .enter().append("path")
                .attr("class", function(d) { return d + " bar"; })
                .datum(group.all());

            g.selectAll(".foreground.bar")
                .attr("clip-path", "url(#clip-" + id + ")");

            g.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + height + ")")
                .call(axis);

            // Initialize the brush component with pretty resize handles.
            var gBrush = g.append("g").attr("class", "brush").call(brush);
            gBrush.selectAll("rect").attr("height", height);
            gBrush.selectAll(".resize").append("path").attr("d", resizePath);
          }

          // Only redraw the brush if set externally.
          if (brushDirty) {
            brushDirty = false;
            g.selectAll(".brush").call(brush);
            div.select(".title a").style("display", brush.empty() ? "none" : null);
            if (brush.empty()) {
              g.selectAll("#clip-" + id + " rect")
                  .attr("x", 0)
                  .attr("width", width);
            } else {
              var extent = brush.extent();
              g.selectAll("#clip-" + id + " rect")
                  .attr("x", x(extent[0]))
                  .attr("width", x(extent[1]) - x(extent[0]));
            }
          }

          g.selectAll(".bar").attr("d", barPath);
        });

        function barPath(groups) {
          var path = [],
              i = -1,
              n = groups.length,
              d;
          while (++i < n) {
            d = groups[i];
            path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
          }
          return path.join("");
        }

        function resizePath(d) {
          var e = +(d == "e"),
              x = e ? 1 : -1,
              y = height / 3;
          return "M" + (.5 * x) + "," + y
              + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
              + "V" + (2 * y - 6)
              + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
              + "Z"
              + "M" + (2.5 * x) + "," + (y + 8)
              + "V" + (2 * y - 8)
              + "M" + (4.5 * x) + "," + (y + 8)
              + "V" + (2 * y - 8);
        }
      }

      brush.on("brushstart.chart", function() {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", null);
      });

      brush.on("brush.chart", function() {
        var g = d3.select(this.parentNode),
            extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
          .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
            .attr("x", x(extent[0]))
            .attr("width", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);
        update_hist_highlight();
      });

      brush.on("brushend.chart", function() {
        if (brush.empty()) {
          var div = d3.select(this.parentNode.parentNode.parentNode);
          div.select(".title a").style("display", "none");
          div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
          dimension.filterAll();
        }
      });

      chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
      };

      chart.x = function(_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
      };

      chart.y = function(_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
      };

      chart.dimension = function(_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
      };

      chart.filter = function(_) {
        if (_) {
          brush.extent(_);
          dimension.filterRange(_);
        } else {
          brush.clear();
          dimension.filterAll();
        }
        brushDirty = true;
        return chart;
      };

      chart.group = function(_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
      };

      chart.property = function(_) {
        if (!arguments.length) return property;
        property = _;
        return chart;
      };

      chart.round = function(_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
      };

      return d3.rebind(chart, brush, "on");
    };
};