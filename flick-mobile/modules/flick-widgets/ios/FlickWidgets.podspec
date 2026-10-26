Pod::Spec.new do |s|
  s.name           = 'FlickWidgets'
  s.version        = '0.1.0'
  s.summary        = 'Shares eqlShare data with the widgets through the App Group.'
  s.author         = 'eqlShare'
  s.homepage       = 'https://www.eqlshare.com'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
