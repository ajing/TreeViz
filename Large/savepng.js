
d3.select("#savepng").on("click", function(){
  var html = d3.select(".intgraph svg")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;
  console.log(html);
  var canvas = document.getElementById("canvas");
  canvg(canvas, html);
  var a = document.createElement("a");
  a.download = "sample.svg";
  a.href = canvas.toDataURL("image/svg");
  a.click();
});

d3.select("#savesvg").on("click", function(){
  d3.select(this)
    .attr("href", 'data:application/octet-stream;base64,' + btoa(d3.select(".intgraph svg").html()))
    .attr("download", "sample.svg")
})