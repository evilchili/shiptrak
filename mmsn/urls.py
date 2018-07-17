from django.conf.urls import include, url
from django.contrib import admin
from django.views import static
from shiptrak import views
from mmsn import settings
admin.autodiscover()

urlpatterns = [
    url(r'^$', views.map, name='shiptrak'),
    url(r'^positions/', views.positions, name='positions'),
    url(r'^faq/', views.faq, name='faq'),
    url(r'^grappelli/', include('grappelli.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^static/(?P<path>.*)$', static.serve, {'document_root': settings.STATIC_ROOT})
]
