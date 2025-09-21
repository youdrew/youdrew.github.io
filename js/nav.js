// 导航栏自动显示/隐藏功能
$(document).ready(function(){
    var showNavTimeout;
    var navTriggerZone = 50; // 触发区域宽度（像素）
    
    // 监听鼠标移动
    $(document).mousemove(function(e) {
        if (e.pageX <= navTriggerZone) {
            // 鼠标移动到左侧触发区域
            clearTimeout(showNavTimeout);
            $("header").addClass("show_menu");
        } else {
            // 鼠标移出触发区域
            showNavTimeout = setTimeout(function() {
                if (!$("header:hover").length) {
                    $("header").removeClass("show_menu");
                }
            }, 300);
        }
    });

    // 当鼠标在导航栏上时保持显示
    $("header").hover(
        function() {
            clearTimeout(showNavTimeout);
        },
        function() {
            showNavTimeout = setTimeout(function() {
                $("header").removeClass("show_menu");
            }, 300);
        }
    );
});