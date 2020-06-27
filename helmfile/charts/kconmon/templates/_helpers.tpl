{{/*
Expand the name of the chart.
*/}}
{{- define "kconmon.app.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "kconmon.app.labels.standard" -}}
app: {{ include "kconmon.app.name" . }}
heritage: {{ .Release.Service | quote }}
release: {{ .Release.Name | quote }}
chart: {{ .Chart.Name }}
{{- end -}}
