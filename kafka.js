require.config({
//    baseUrl: '/resources/assets/external/kafkatools',
  shim: {
    'socketio': {
      exports: 'io'
    },
  //  'd3' : {exports: 'd3'},
    'epoch': {deps: ['d3lib']}
  },
  paths: { 
    socketio: '/resources/assets/external/kafkatools/socket.io',
    d3lib: '/resources/assets/external/kafkatools/d3.min',
    epoch: '/resources/assets/external/kafkatools/epoch.min'
  }
});


define( ["qlik", "jquery", "text!./colors.css", "text!./epoch.min.css", "text!./bootstrap.min.css", "socketio", "d3lib", "epoch"], 
    function ( qlik, $, colorsCss, epochCss, bootCss, io) {'use strict';

    var socket = io.connect('*****hostname:port*****');
    var chart = null;
    var defaultsensor = '****sensor key****';

$("<style>").html(colorsCss).appendTo("head");
$("<style>").html(epochCss).appendTo("head");

	return {

       initialProperties : {
            qHyperCubeDef : {
                qDimensions : [],
                qMeasures : [],
                qInitialDataFetch : [{
                    qWidth : 10,
                    qHeight : 50
                }]
            }
        },
        definition : {
            type : "items",
            component : "accordion",
            items : {
                dimensions : {
                    uses : "dimensions",
                    min : 1
                },
                measures : {
                    uses : "measures",
                    min : 0
                },
                sorting : {
                    uses : "sorting"
                },
                settings : {
                    uses : "settings",
                    items : {
                        initFetchRows : {
                            ref : "qHyperCubeDef.qInitialDataFetch.0.qHeight",
                            label : "Initial fetch rows",
                            type : "number",
                            defaultValue : 50
                        }
                    }
                }
            }
        },
		support : {
			snapshot: true,
			export: true,
			exportData : false
		},
        
		paint: function ($element, layout) {
		//	$element.html((Math.random()*1000).toString());

            var deviceid = layout.qHyperCube.qDataPages[0].qMatrix[0][0].qNum;

            if (socket != null) {
                console.log("changesensor" + defaultsensor + " " + deviceid);
                socket.emit("changesensor", {from: defaultsensor, to:deviceid});
                defaultsensor = deviceid;
            }
			return qlik.Promise.resolve();
		},
        
        controller: ["$scope", "$element", function($scope, $element) {

        $element.html('<div class="panel-body" id="chart-container" style="background-image: url(/resources/assets/external/kafkatools/penc.png);"><div id="chart" class="epoch" style="width:100%; min-height:250px; height: 100%;"></div></div>');
		 
                 socket.on('init', function(initdata) {

                    chart = $('#chart').epoch({
                        type: 'time.area',
                        data: initdata, 
                        axes: ['bottom', 'right'],
                        windowSize: 600,
                        historySize: 600,
                        ticks : { time: 50, right: 15, left: 5 },
                        tickFormats: { bottom: function(d) { return new Date(d*1000).toString().substr(16,8);}}
                    });
				 });

                 // sunucudan her push geldiğinde chart içine ekliyoruz.
                socket.on('push', function(pushdata){
                      chart.push([pushdata[0]]);
                });

                socket.on("resetchart", function(sensordata) {
                    
                    console.log("resetchart");
                    console.log(sensordata);
                    var chartContainer = $("#chart-container");
                    chartContainer.empty();
                    var divChart = $("<div>");
                    divChart.attr("id", "chart");
                    divChart.addClass("epoch");
                    divChart.addClass("my-colors");
                    divChart.width("100%");
                    divChart.height("100%");
                    divChart.css("min-height", "250px");
                    
                    chartContainer.append(divChart);

                    chart = $('#chart').epoch({
                        type: 'time.area',
                        data: sensordata[0],
                        axes: ['bottom', 'right'],
                        windowSize: 200,/*600*/
                        historySize: 600,
                        tickFormats: { bottom: function(d) { return new Date(d*1000).toString().substr(16,8);}},
                        ticks : { time: 20, right: 15, left: 5 }/*50 15 5*/

                    });

                    chart.redraw();
                    
                  
                });

            }]
	};

} );

