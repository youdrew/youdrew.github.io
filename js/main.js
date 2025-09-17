// 这个是页面的主要逻辑代码


// 确保在DOM完全加载后才执行代码
$(document).ready(function(){
    

    // 当点击菜单图标时：
    // - 切换导航菜单的显示/隐藏（通过 show_menu 类）
    // - 切换菜单图标的状态（通过 close_menu 类）
    // - 阻止默认点击事件
    $("#menu_icon").click(function(){
        $("header nav ul").toggleClass("show_menu");
        $("#menu_icon").toggleClass("close_menu");
        return false;
    });
    
    //Contact Page Map Centering
var hw = $('header').width() + 50;  // 头部宽度 + 50px边距
var mw = $('#map').width();         // 地图容器宽度
var wh = $(window).height();        // 窗口高度
var ww = $(window).width();         // 窗口宽度

// 设置地图尺寸
$('#map').css({
    "max-width" : mw,
    "height" : wh
});

// 在大屏幕下调整位置
if(ww>1100){
     $('#map').css({
        "margin-left" : hw
    });
}

    //Tooltip
    $("a").mouseover(function(){

        var attr_title = $(this).attr("data-title");

        if( attr_title == undefined || attr_title == "") return false;
        
        $(this).after('<span class="tooltip"></span>');

        var tooltip = $(".tooltip");
        tooltip.append($(this).data('title'));

         
        var tipwidth = tooltip.outerWidth();
        var a_width = $(this).width();
        var a_hegiht = $(this).height() + 3 + 4;

        //if the tooltip width is smaller than the a/link/parent width
        if(tipwidth < a_width){
            tipwidth = a_width;
            $('.tooltip').outerWidth(tipwidth);
        }

        var tipwidth = '-' + (tipwidth - a_width)/2;
        $('.tooltip').css({
            'left' : tipwidth + 'px',
            'bottom' : a_hegiht + 'px'
        }).stop().animate({
            opacity : 1
        }, 200);
      

    });

    $("a").mouseout(function(){
        var tooltip = $(".tooltip");       
        tooltip.remove();
    });


});





